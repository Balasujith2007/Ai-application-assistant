import prisma from '../lib/prisma';
import { signToken } from '../lib/serverAuth';

interface MetricResult {
  endpoint: string;
  role: string;
  requests: number;
  successes: number;
  failures: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  rps: number;
}

function calculatePercentiles(latencies: number[]): { p50: number; p90: number; p95: number; p99: number; min: number; max: number; avg: number } {
  if (latencies.length === 0) {
    return { p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  }
  latencies.sort((a, b) => a - b);
  const min = Math.round(latencies[0]);
  const max = Math.round(latencies[latencies.length - 1]);
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / latencies.length);

  const getP = (p: number) => {
    const idx = Math.min(Math.floor((p / 100) * latencies.length), latencies.length - 1);
    return Math.round(latencies[idx]);
  };

  return {
    p50: getP(50),
    p90: getP(90),
    p95: getP(95),
    p99: getP(99),
    min,
    max,
    avg,
  };
}

async function runBenchmarkBatch(
  name: string,
  url: string,
  token: string,
  totalRequests: number,
  concurrency: number,
  method: string = 'GET',
  body?: any
): Promise<MetricResult> {
  const latencies: number[] = [];
  let successes = 0;
  let failures = 0;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  let currentIndex = 0;
  const startTime = Date.now();

  const worker = async () => {
    while (currentIndex < totalRequests) {
      currentIndex++;
      const reqStart = performance.now();
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        const reqEnd = performance.now();
        if (res.ok) {
          successes++;
          latencies.push(reqEnd - reqStart);
        } else {
          failures++;
        }
      } catch (err) {
        failures++;
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  const totalDurationSeconds = (Date.now() - startTime) / 1000;
  const stats = calculatePercentiles(latencies);
  const rps = Math.round((totalRequests / (totalDurationSeconds || 0.001)) * 10) / 10;

  return {
    endpoint: name,
    role: 'BENCHMARK',
    requests: totalRequests,
    successes,
    failures,
    rps,
    ...stats,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('⚡ CAREERAI BASELINE PERFORMANCE BENCHMARK (PHASE 2)');
  console.log('========================================================================\n');

  const [student, mentor, hod, superAdmin] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'STUDENT' }, include: { profile: true } }),
    prisma.user.findFirst({ where: { role: 'MENTOR' }, include: { profile: true } }),
    prisma.user.findFirst({ where: { role: 'HOD' }, include: { profile: true } }),
    prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, include: { profile: true } }),
  ]);

  if (!student || !mentor || !hod || !superAdmin) {
    console.error('Could not find required role accounts in database.');
    process.exit(1);
  }

  const sToken = signToken({ id: student.id, email: student.email, role: student.role });
  const mToken = signToken({ id: mentor.id, email: mentor.email, role: mentor.role });
  const hToken = signToken({ id: hod.id, email: hod.email, role: hod.role });
  const saToken = signToken({ id: superAdmin.id, email: superAdmin.email, role: superAdmin.role });

  console.log('Measuring warm baseline across all critical routes (Single / Low concurrency: 5 reqs each)...');

  const testEndpoints = [
    { name: 'Student Dashboard', url: 'http://localhost:3000/api/dashboard/student', token: sToken, n: 10, c: 2 },
    { name: 'Leaderboard & Scoring', url: 'http://localhost:3000/api/leaderboard?periodType=ALL_TIME', token: sToken, n: 4, c: 1 },
    { name: 'Opportunities & Hackathons', url: 'http://localhost:3000/api/opportunities', token: sToken, n: 10, c: 2 },
    { name: 'Student Applications', url: 'http://localhost:3000/api/applications', token: sToken, n: 10, c: 2 },
    { name: 'Daily Check-in Status', url: 'http://localhost:3000/api/check-in', token: sToken, n: 10, c: 2 },
    { name: 'Notifications', url: 'http://localhost:3000/api/notifications', token: sToken, n: 10, c: 2 },
    { name: 'Mentor Dashboard', url: 'http://localhost:3000/api/mentor/dashboard', token: mToken, n: 10, c: 2 },
    { name: 'HOD Dashboard', url: 'http://localhost:3000/api/hod/dashboard', token: hToken, n: 10, c: 2 },
    { name: 'Super Admin Analytics', url: 'http://localhost:3000/api/super-admin/dashboard', token: saToken, n: 10, c: 2 },
    { name: 'Extension Profile API', url: 'http://localhost:3000/api/extension/profile', token: sToken, n: 10, c: 2 },
  ];

  const results: MetricResult[] = [];

  for (const ep of testEndpoints) {
    process.stdout.write(`Benchmarking ${ep.name}... `);
    const res = await runBenchmarkBatch(ep.name, ep.url, ep.token, ep.n, ep.c);
    results.push(res);
    console.log(`p50: ${res.p50}ms | p95: ${res.p95}ms | p99: ${res.p99}ms | RPS: ${res.rps}`);
  }

  console.log('\n------------------------------------------------------------------------');
  console.log('TESTING CURRENT ARCHITECTURE AT 50 CONCURRENT REQUESTS (STRESS PROBE)');
  console.log('------------------------------------------------------------------------');
  // Concurrency probe with 50 requests across dashboard
  const probeDash = await runBenchmarkBatch('Dashboard Stress (50 CCU)', 'http://localhost:3000/api/dashboard/student', sToken, 50, 50);
  console.log(`Dashboard (50 CCU): Success=${probeDash.successes}/${probeDash.requests}, p50=${probeDash.p50}ms, p95=${probeDash.p95}ms, RPS=${probeDash.rps}`);

  // Concurrency probe with 15 requests across Leaderboard
  const probeLeader = await runBenchmarkBatch('Leaderboard Stress (15 CCU)', 'http://localhost:3000/api/leaderboard?periodType=ALL_TIME', sToken, 15, 15);
  console.log(`Leaderboard (15 CCU): Success=${probeLeader.successes}/${probeLeader.requests}, p50=${probeLeader.p50}ms, p95=${probeLeader.p95}ms, Failures=${probeLeader.failures}`);

  console.log('\n========================================================================');
  console.log('BASELINE PERFORMANCE SUMMARY TABLE:');
  console.log('========================================================================');
  console.table(
    results.map((r) => ({
      Endpoint: r.endpoint,
      Requests: r.requests,
      Success: r.successes,
      Failures: r.failures,
      'p50 (ms)': r.p50,
      'p95 (ms)': r.p95,
      'p99 (ms)': r.p99,
      RPS: r.rps,
    }))
  );

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
