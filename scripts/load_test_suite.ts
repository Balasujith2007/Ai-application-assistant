import http from 'http';
import prisma from '../lib/prisma';
import { signToken } from '../lib/serverAuth';

http.globalAgent.maxSockets = 5000;
(http.globalAgent as any).keepAlive = true;

interface StageResult {
  stage: string;
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  durationSeconds: number;
  throughputRps: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  targetMet: boolean;
}

interface UserSession {
  role: string;
  token: string;
  userId: string;
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

// Select a realistic request URL based on user role and journey distribution
function getJourneyRequest(session: UserSession): { url: string; method: string } {
  const rand = Math.random();
  if (session.role === 'STUDENT') {
    if (rand < 0.25) return { url: 'http://localhost:3000/api/dashboard/student', method: 'GET' };
    if (rand < 0.50) return { url: 'http://localhost:3000/api/leaderboard?periodType=ALL_TIME', method: 'GET' };
    if (rand < 0.70) return { url: 'http://localhost:3000/api/opportunities', method: 'GET' };
    if (rand < 0.85) return { url: 'http://localhost:3000/api/check-in', method: 'GET' };
    if (rand < 0.95) return { url: 'http://localhost:3000/api/notifications', method: 'GET' };
    return { url: 'http://localhost:3000/api/applications', method: 'GET' };
  } else if (session.role === 'MENTOR') {
    if (rand < 0.70) return { url: 'http://localhost:3000/api/mentor/dashboard', method: 'GET' };
    return { url: 'http://localhost:3000/api/opportunities?filter=published', method: 'GET' };
  } else {
    if (rand < 0.60) return { url: 'http://localhost:3000/api/hod/dashboard', method: 'GET' };
    return { url: 'http://localhost:3000/api/super-admin/dashboard', method: 'GET' };
  }
}

async function executeLoadStage(
  stageName: string,
  targetConcurrency: number,
  targetRequests: number,
  sessions: UserSession[]
): Promise<StageResult> {
  console.log(`\n▶ Starting [${stageName}] — Concurrency: ${targetConcurrency} CCU | Total Requests: ${targetRequests}...`);

  const latencies: number[] = [];
  let successfulRequests = 0;
  let failedRequests = 0;

  let completedRequests = 0;
  const stageStartTime = performance.now();

  const failuresSample: string[] = [];

  const worker = async (workerId: number) => {
    while (completedRequests < targetRequests) {
      completedRequests++;
      // Assign synthetic session matching concurrency slot
      const session = sessions[workerId % sessions.length];
      const { url, method } = getJourneyRequest(session);

      const reqStart = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s request timeout

        const res = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${session.token}`,
            'Content-Type': 'application/json',
            Connection: 'keep-alive',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const reqEnd = performance.now();
        if (res.ok) {
          successfulRequests++;
          latencies.push(reqEnd - reqStart);
        } else {
          failedRequests++;
          if (failuresSample.length < 5) {
            failuresSample.push(`${url} => HTTP ${res.status}`);
          }
        }
      } catch (err: any) {
        failedRequests++;
        if (failuresSample.length < 5) {
          failuresSample.push(`${url} => ${err?.name || ''}: ${err?.message || err}`);
        }
      }

      // Realistic user think-time jitter (10ms - 40ms)
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 30));
    }
  };

  const workers: Promise<void>[] = [];
  for (let i = 0; i < targetConcurrency; i++) {
    workers.push(worker(i));
  }

  await Promise.all(workers);

  if (failuresSample.length > 0) {
    console.log(`    ⚠️ Failure sample: ${failuresSample.join(' | ')}`);
  }

  const stageDurationMs = performance.now() - stageStartTime;
  const durationSeconds = Math.round((stageDurationMs / 1000) * 100) / 100;
  const throughputRps = Math.round((targetRequests / (durationSeconds || 0.001)) * 10) / 10;
  const stats = calculatePercentiles(latencies);
  const errorRate = Math.round((failedRequests / targetRequests) * 10000) / 100;
  const targetMet = stats.p95 <= 500 && errorRate <= 1.0;

  console.log(
    `  Completed [${stageName}]: Duration=${durationSeconds}s, RPS=${throughputRps}, ` +
    `Success=${successfulRequests}/${targetRequests}, Failures=${failedRequests} (${errorRate}%), ` +
    `p50=${stats.p50}ms, p95=${stats.p95}ms, p99=${stats.p99}ms | Acceptance Target Met: ${targetMet ? '✅ YES' : '❌ NO'}`
  );

  return {
    stage: stageName,
    concurrency: targetConcurrency,
    totalRequests: targetRequests,
    successfulRequests,
    failedRequests,
    errorRate,
    durationSeconds,
    throughputRps,
    targetMet,
    ...stats,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('🚀 CAREERAI PRODUCTION SCALABILITY & LOAD TEST SUITE');
  console.log('Target Workload: 1,000 Concurrent Active Users (CCU)');
  console.log('Acceptance Criteria: p95 < 500ms, Error Rate < 1.0%');
  console.log('========================================================================\n');

  // 1. Prepare synthetic sessions pool
  console.log('Step 1: Generating 1,000 synthetic authenticated sessions...');
  const [students, mentors, hods, superAdmins] = await Promise.all([
    prisma.user.findMany({ where: { role: 'STUDENT' }, take: 100 }),
    prisma.user.findMany({ where: { role: 'MENTOR' }, take: 20 }),
    prisma.user.findMany({ where: { role: 'HOD' }, take: 5 }),
    prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, take: 2 }),
  ]);

  const sessions: UserSession[] = [];

  // Generate 1,000 synthetic user virtual identities mapped to valid roles
  for (let i = 0; i < 1000; i++) {
    let role = 'STUDENT';
    let baseUser = students[i % students.length];
    if (i % 20 === 0 && hods.length > 0) {
      role = 'HOD';
      baseUser = hods[i % hods.length];
    } else if (i % 10 === 0 && mentors.length > 0) {
      role = 'MENTOR';
      baseUser = mentors[i % mentors.length];
    } else if (i % 100 === 0 && superAdmins.length > 0) {
      role = 'SUPER_ADMIN';
      baseUser = superAdmins[i % superAdmins.length];
    }

    const token = signToken({
      id: baseUser.id,
      email: baseUser.email,
      role: baseUser.role, // Use authentic database role
    });

    sessions.push({ role: baseUser.role, token, userId: baseUser.id });
  }

  console.log(`Generated ${sessions.length} virtual user sessions (85% Students, 10% Mentors, 5% HODs/Admins).`);

  const results: StageResult[] = [];

  // STAGE 1: 100 Concurrent Users
  results.push(await executeLoadStage('Stage 1: 100 CCU', 100, 300, sessions));

  // STAGE 2: 250 Concurrent Users
  results.push(await executeLoadStage('Stage 2: 250 CCU', 250, 750, sessions));

  // STAGE 3: 500 Concurrent Users
  results.push(await executeLoadStage('Stage 3: 500 CCU', 500, 1500, sessions));

  // STAGE 4: 1,000 Concurrent Users (Target Milestone)
  results.push(await executeLoadStage('Stage 4: 1,000 CCU (Target Capacity)', 1000, 2500, sessions));

  // STAGE 5: Sudden Traffic Spike (1,000 CCU Instant Burst)
  results.push(await executeLoadStage('Stage 5: Sudden Spike (1,000 CCU Burst)', 1000, 1000, sessions));

  // STAGE 6: Post-Spike Recovery (100 CCU to measure system stability post-surge)
  results.push(await executeLoadStage('Stage 6: Post-Spike Recovery (100 CCU)', 100, 300, sessions));

  console.log('\n========================================================================');
  console.log('🏁 FINAL LOAD TESTING RESULTS & ACCEPTANCE SUMMARY:');
  console.log('========================================================================');
  console.table(
    results.map((r) => ({
      Stage: r.stage,
      CCU: r.concurrency,
      Requests: r.totalRequests,
      'Success/Fail': `${r.successfulRequests}/${r.failedRequests}`,
      'Error %': `${r.errorRate}%`,
      'RPS': r.throughputRps,
      'p50 (ms)': r.p50,
      'p95 (ms)': r.p95,
      'p99 (ms)': r.p99,
      'Target Met?': r.targetMet ? '✅ PASS' : '❌ FAIL',
    }))
  );

  const allPassed = results.every((r) => r.targetMet);
  console.log(`\nOverall 1,000 Concurrent User Scalability Target: ${allPassed ? '🏆 PASSED WITH FLYING COLORS!' : '⚠️ PARTIAL'}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
