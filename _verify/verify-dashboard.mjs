// Playwright verification for the RESTORED original Student Overview layout.
// Mocks all /api/** so no real data / production DB is touched.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3210';
const OUT = path.resolve('screenshots');
fs.mkdirSync(OUT, { recursive: true });

const USER = { id: 'test-student-1', name: 'Aarav Sharma', email: 'aarav@example.com', role: 'STUDENT' };

// Mirrors the real GET /api/dashboard/student response shape (reverted original).
const DASHBOARD = {
  user: { name: 'Aarav Sharma', email: 'aarav@example.com', cgpa: 0, department: 'CSE' },
  stats: { total: 8, active: 3, interviews: 1, selected: 1, tasks: { total: 4, completed: 2 } },
  careerActivity: { hackathons: 2, internships: 3, competitions: 1, workshops: 0, completed: 2, ongoing: 3, total: 6 },
  profileCompletion: 85,
  resumeScore: 78,
  activities: [],
};

const APPLICATIONS = [
  { id: 'a1', companyName: 'Zoho', position: 'SWE Intern', status: 'APPLIED' },
  { id: 'a2', companyName: 'Freshworks', position: 'Frontend Intern', status: 'APPLIED' },
  { id: 'a3', companyName: 'TCS', position: 'Graduate Engineer', status: 'UNDER_REVIEW' },
  { id: 'a4', companyName: 'Infosys', position: 'SE', status: 'SHORTLISTED' },
  { id: 'a5', companyName: 'Google', position: 'STEP Intern', status: 'INTERVIEW' },
  { id: 'a6', companyName: 'Microsoft', position: 'SWE Intern', status: 'SELECTED' },
  { id: 'a7', companyName: 'Wipro', position: 'Analyst', status: 'REJECTED' },
  { id: 'a8', companyName: 'Unstop', position: 'Campus Rep', status: 'APPLIED' },
];

const INTERVIEWS = [
  { id: 'i1', companyName: 'Google', position: 'STEP Intern', date: '2026-11-12', result: 'Pending' },
  { id: 'i2', companyName: 'Microsoft', position: 'SWE Intern', date: '2026-11-20', result: 'Pending' },
];

const OPPORTUNITIES = [
  { id: 'o1', companyName: 'Unstop', organization: 'Unstop', role: 'Summer Internship 2026', title: 'Summer Internship 2026', type: 'INTERNSHIP', deadline: '2026-11-09', location: 'Remote' },
  { id: 'o2', companyName: 'Infosys', organization: 'Infosys', role: 'Freshers Drive', title: 'Freshers Drive', type: 'JOB', deadline: '2026-11-18', location: 'Bengaluru' },
  { id: 'o3', companyName: 'HackerEarth', organization: 'HackerEarth', role: 'Code Sprint', title: 'Code Sprint', type: 'HACKATHON', deadline: '2026-11-25', location: 'Online' },
  { id: 'o4', companyName: 'Smart India', organization: 'Smart India', role: 'Hackathon 2026', title: 'Hackathon 2026', type: 'COMPETITION', deadline: '2026-12-02', location: 'Hybrid' },
  { id: 'o5', companyName: 'Google', organization: 'Google', role: 'STEP Internship', title: 'STEP Internship', type: 'INTERNSHIP', deadline: '2026-12-10', location: 'Hyderabad' },
];

const CHECKIN = {
  success: true,
  checkedInToday: true,
  todayXpEarned: 20,
  totalEarnedXp: 1450,
  secondsUntilNextCheckIn: 3600,
  streak: { currentStreak: 6, longestStreak: 12, totalActiveDays: 40, progressInCycle: 6, targetInCycle: 7 },
};

const CLASS_LB = {
  success: true,
  classInfo: { department: 'CSE', year: 3, section: 'A', displayName: 'CSE Year 3-A' },
  stats: { totalStudents: 42, activeStudents: 30, averageScore: 820, highestScore: 1980, currentUserRank: 7, currentUserScore: 1450 },
  rankings: [],
};

const CAREER_LB = {
  success: true,
  weekKey: '2026-W45',
  leaderboard: [
    { rank: 1, studentId: 's1', studentName: 'Priya Nair', profilePhotoUrl: null, careerGrowthScore: 94, rankTier: 'LEGENDARY', internshipScore: 96, hackathonScore: 90, resumeScore: 88, rankMovement: 'up', movementValue: 1 },
    { rank: 2, studentId: 's2', studentName: 'Rahul Verma', profilePhotoUrl: null, careerGrowthScore: 88, rankTier: 'EPIC', internshipScore: 84, hackathonScore: 92, resumeScore: 80, rankMovement: 'same', movementValue: 0 },
    { rank: 3, studentId: 's3', studentName: 'Aarav Sharma', profilePhotoUrl: null, careerGrowthScore: 78, rankTier: 'RARE', internshipScore: 82, hackathonScore: 70, resumeScore: 82, rankMovement: 'up', movementValue: 2 },
    { rank: 4, studentId: 's4', studentName: 'Sneha Iyer', profilePhotoUrl: null, careerGrowthScore: 74, rankTier: 'RARE', internshipScore: 70, hackathonScore: 78, resumeScore: 72, rankMovement: 'down', movementValue: 1 },
    { rank: 5, studentId: 's5', studentName: 'Karthik Rao', profilePhotoUrl: null, careerGrowthScore: 69, rankTier: 'COMMON', internshipScore: 66, hackathonScore: 70, resumeScore: 68, rankMovement: 'new', movementValue: 0 },
  ],
  currentStudent: { rank: 3, careerGrowthScore: 78, internshipScore: 82, hackathonScore: 70, resumeScore: 82 },
};

const CAT = (key, label, weight, raw) => ({ key, label, weight, rawScore: raw, weightedPoints: Math.round(raw * weight) / 100, milestones: [] });

const CAREER_GROWTH = {
  success: true,
  week: { weekKey: '2026-W45', startDate: '2026-11-02', endDate: '2026-11-08' },
  careerGrowth: {
    finalScore: 78,
    tier: 'RARE',
    categories: {
      internshipApplications: CAT('internshipApplications', 'Internship & Job Applications', 35, 82),
      hackathonsCompetitions: CAT('hackathonsCompetitions', 'Hackathons & Competitions', 35, 70),
      resumeStrength: CAT('resumeStrength', 'Resume Strength', 30, 82),
    },
    resumeCriteria: [],
    resumeImprovement: { key: 'improvement', label: 'Improvement', earned: 4, max: 10, available: true },
    counts: {},
    unavailableCriteria: ['Certifications'],
    computedAt: '2026-11-05T06:00:00.000Z',
  },
  latestFinalized: { weekKey: '2026-W44', finalScore: 70, tier: 'COMMON', snapshotAt: '2026-11-01T06:00:00.000Z' },
  latestGift: { tier: 'RARE', rewardRarity: 'RARE', status: 'ALLOCATED', weekKey: '2026-W45' },
};

const ACHIEVEMENTS = {
  success: true,
  summary: { totalEarned: 9, totalAvailable: 24, completionPercentage: 38, totalXp: 1450, currentStreak: 6, longestStreak: 12 },
  badges: [],
};

const REWARDS = {
  success: true,
  availableRewards: [
    { id: 'r1', rewardType: 'MYSTERY_GIFT', rewardRarity: 'RARE', weeklyScore: 78, weeklyRank: 'RARE', personalizedMessage: 'Great week!', reasonEarned: 'Weekly career growth', allocatedAt: '2026-11-05T06:00:00.000Z' },
  ],
};

const INVENTORY = {
  success: true,
  balance: { totalXp: 1450, availableCoins: 240, totalBadges: 9, totalRewards: 2 },
  gifts: { available: [], claimed: [] },
  tokens: {
    streakRescue: { available: [], usedCount: 1, expiredCount: 0, eligibleDates: [], rulesEnabled: true },
    leaderboardBoost: { available: [], usedCount: 0, expiredCount: 0, status: { available: false, reason: 'Not eligible', activeDays: 0, rankingNeutral: true } },
  },
  cosmetics: { frames: [], titles: [], badges: [], showcaseBadgeIds: [] },
  coinHistory: [],
  purchaseHistory: [],
};

const ROUTES = [
  [/^\/api\/auth\/me$/, { data: USER }],
  [/^\/api\/sidebar$/, { data: [
    { id: 'overview', label: 'Overview', path: '/dashboard/student', icon: 'LayoutDashboard' },
    { id: 'opp', label: 'Opportunities', path: '/dashboard/student/opportunities', icon: 'Compass' },
    { id: 'apps', label: 'Applications', path: '/dashboard/student/applications', icon: 'Briefcase' },
  ] }],
  [/^\/api\/dashboard\/student$/, DASHBOARD],
  [/^\/api\/applications/, APPLICATIONS],
  [/^\/api\/tasks$/, []],
  [/^\/api\/interviews$/, INTERVIEWS],
  [/^\/api\/opportunities\/recommended$/, OPPORTUNITIES],
  [/^\/api\/check-in$/, CHECKIN],
  [/^\/api\/coins$/, { success: true, balance: 240, transactions: [] }],
  [/^\/api\/leaderboard\/career$/, CAREER_LB],
  [/^\/api\/leaderboard/, CLASS_LB],
  [/^\/api\/career-growth$/, CAREER_GROWTH],
  [/^\/api\/achievements$/, ACHIEVEMENTS],
  [/^\/api\/rewards$/, REWARDS],
  [/^\/api\/inventory$/, INVENTORY],
  [/^\/api\/shop$/, { success: true, items: [], balance: 240 }],
  [/^\/api\/profile\/customization$/, { success: true, cosmetics: INVENTORY.cosmetics }],
  [/^\/api\/notifications\/unread-count$/, { count: 0 }],
  [/^\/api\/notifications$/, { data: [] }],
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  const browser = await chromium.launch();
  const consoleErrors = [];

  for (const device of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport: { width: device.width, height: device.height } });
    await context.addInitScript((u) => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify(u));
    }, USER);

    await context.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/notifications/stream') return route.abort();
      for (const [re, body] of ROUTES) {
        if (re.test(url.pathname)) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        }
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const page = await context.newPage();
    page.on('pageerror', (e) => consoleErrors.push(`[${device.name}] ${e.message}`));

    await page.goto(`${BASE}/dashboard/student`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Career Readiness Score', { timeout: 25000 });
    await page.waitForTimeout(2500);

    const body = (await page.textContent('body')) || '';

    // A. Welcome header
    check(`${device.name}: welcome greeting personalised`, /, Aarav!/.test(body));
    check(`${device.name}: career readiness badge (from API)`, /Career Readiness: 85%/.test(body));

    // B. Summary cards
    check(`${device.name}: summary cards`, /My Applications/.test(body) && /Upcoming Interviews/.test(body) && /Deadlines/.test(body));

    // C. Career Readiness breakdown
    check(
      `${device.name}: readiness breakdown`,
      /Resume Optimization/.test(body) &&
        /Profile & Verification/.test(body) &&
        /Skill Verifications/.test(body) &&
        /Placement Applications/.test(body)
    );

    // D. Deadlines + notifications (left column lower row)
    check(`${device.name}: upcoming deadlines`, /Upcoming Deadlines/.test(body));
    check(`${device.name}: notifications panel`, /Notifications & Reminders/.test(body));

    // Right sidebar widgets (Career Leaderboard widget must NOT be present)
    check(
      `${device.name}: right sidebar widgets intact`,
      /Weekly Career Growth/.test(body) &&
        /Reward Inventory/.test(body) &&
        /Coin Shop/.test(body)
    );
    check(`${device.name}: Career Leaderboard widget removed`, !/Career Leaderboard/.test(body));
    check(
      `${device.name}: no Career Leaderboard internals`,
      !/Category Breakdown/.test(body) && !/Top performers by career growth/.test(body)
    );

    // Core gamification widgets still functional
    check(`${device.name}: daily check-in widget`, /Daily Check-In/.test(body));
    check(`${device.name}: XP summary rendered`, /1,450/.test(body));
    check(`${device.name}: coin balance rendered`, /240/.test(body));

    // Rank badge comes from the class leaderboard API (currentUserRank: 7)
    check(`${device.name}: class rank matches API`, /#7/.test(body), 'expected #7');

    // Removed sections must be absent
    check(`${device.name}: IRP removed`, !/\bIRP\b/.test(body));
    check(`${device.name}: Refer & Earn removed`, !/Refer & Earn/.test(body) && !/8,000/.test(body));

    // Original two-column container present
    const layout = await page.evaluate(() => {
      const grid = document.querySelector('.dash-grid');
      const right = document.querySelector('.dash-right-sidebar');
      const main = document.querySelector('.dash-main');
      return {
        hasGrid: !!grid,
        rightW: right ? Math.round(right.getBoundingClientRect().width) : 0,
        mainW: main ? Math.round(main.getBoundingClientRect().width) : 0,
      };
    });
    check(`${device.name}: dash-grid container restored`, layout.hasGrid);
    if (device.name === 'desktop') {
      check('desktop: right sidebar locked to 300px', Math.abs(layout.rightW - 300) <= 2, `width=${layout.rightW}px`);
      check('desktop: main column wider than sidebar', layout.mainW > layout.rightW, `main=${layout.mainW}px`);
    }

    // No horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${device.name}: no horizontal overflow`, overflow <= 1, `overflow=${overflow}px`);

    await page.screenshot({ path: path.join(OUT, `student-overview-${device.name}.png`), fullPage: true });

    await context.close();
  }

  // Dedicated student leaderboard page must still work
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript((u) => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify(u));
    }, USER);
    await context.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/notifications/stream') return route.abort();
      for (const [re, resBody] of ROUTES) {
        if (re.test(url.pathname)) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resBody) });
        }
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/student/progress`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const body = (await page.textContent('body')) || '';
    check('dedicated leaderboard page: Class Leaderboard renders', /Class Leaderboard/.test(body));
    await context.close();
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT, 'verify-results.json'), JSON.stringify({ results, consoleErrors }, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (consoleErrors.length) console.log('Page errors:', consoleErrors.slice(0, 5));
  process.exit(failed.length ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
