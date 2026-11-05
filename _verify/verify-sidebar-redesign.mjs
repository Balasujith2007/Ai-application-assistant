// Playwright verification for "Professional Student Sidebar Redesign".
// Mocks all /api/** so no real data / production DB is touched (isolated data).
//
// Usage:
//   node _verify/verify-sidebar-redesign.mjs --phase=after   (asserts + after screenshots)
//   node _verify/verify-sidebar-redesign.mjs --phase=before  (before screenshots only)
//
// The layout.tsx file is swapped externally (HEAD version = before, working tree = after).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3210';
const OUT = path.resolve('_verify/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const PHASE = (process.argv.find((a) => a.startsWith('--phase=')) || '--phase=after').split('=')[1];

const USER = { id: 'test-student-1', name: 'Aarav Sharma', email: 'aarav@example.com', role: 'STUDENT' };

// Redesigned student navigation (mirrors lib/initializeDefaults.ts after the change).
const NEW_SIDEBAR = [
  { id: 'overview', title: 'Overview', path: '/dashboard/student', order: 0, enabled: true },
  { id: 'opp', title: 'Explore Opportunities', path: '/dashboard/student/opportunities', order: 1, enabled: true },
  { id: 'apps', title: 'My Applications', path: '/dashboard/student/applications', order: 2, enabled: true },
  { id: 'resume', title: 'My Resume', path: '/resume', order: 3, enabled: true },
  { id: 'progress', title: 'Career Progress', path: '/dashboard/student/progress', order: 4, enabled: true },
  { id: 'ach', title: 'Achievements', path: '/dashboard/student/achievements', order: 5, enabled: true },
  { id: 'rewards', title: 'Rewards & Inventory', path: '/dashboard/student/rewards', order: 6, enabled: true },
  { id: 'shop', title: 'Coin Shop', path: '/dashboard/student/shop', order: 7, enabled: true },
  { id: 'tokens', title: 'Tokens', path: '/dashboard/student/tokens', order: 8, enabled: true },
  { id: 'profile', title: 'My Profile', path: '/profile', order: 9, enabled: true },
  { id: 'settings', title: 'Settings', path: '/dashboard/settings', order: 10, enabled: true },
];

// Pre-redesign student navigation (used only for the "before" screenshots).
const OLD_SIDEBAR = [
  { id: 'overview', title: 'Overview', path: '/dashboard/student', order: 0, enabled: true },
  { id: 'opp', title: 'Opportunities', path: '/dashboard/student/opportunities', order: 1, enabled: true },
  { id: 'apps', title: 'My Applications', path: '/dashboard/student/applications', order: 2, enabled: true },
  { id: 'resume', title: 'My Resume', path: '/resume', order: 3, enabled: true },
  { id: 'progress', title: 'My Progress', path: '/dashboard/student/progress', order: 4, enabled: true },
  { id: 'ach', title: 'Achievements', path: '/dashboard/student/achievements', order: 5, enabled: true },
  { id: 'growth', title: 'Career Growth', path: '/dashboard/student/growth', order: 6, enabled: true },
  { id: 'rewards', title: 'Rewards & Inventory', path: '/dashboard/student/rewards', order: 7, enabled: true },
  { id: 'shop', title: 'Coin Shop', path: '/dashboard/student/shop', order: 8, enabled: true },
  { id: 'tokens', title: 'Tokens', path: '/dashboard/student/tokens', order: 9, enabled: true },
  { id: 'clb', title: 'Career Leaderboard', path: '/dashboard/student/leaderboard', order: 10, enabled: true },
];

const SIDEBAR = PHASE === 'before' ? OLD_SIDEBAR : NEW_SIDEBAR;

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
  { id: 'a4', companyName: 'Google', position: 'STEP Intern', status: 'INTERVIEW' },
];

const INTERVIEWS = [
  { id: 'i1', companyName: 'Google', position: 'STEP Intern', date: '2026-11-12', result: 'Pending' },
];

const OPPORTUNITIES = [
  { id: 'o1', companyName: 'Unstop', organization: 'Unstop', role: 'Summer Internship 2026', title: 'Summer Internship 2026', type: 'INTERNSHIP', deadline: '2026-11-09', location: 'Remote' },
  { id: 'o2', companyName: 'Infosys', organization: 'Infosys', role: 'Freshers Drive', title: 'Freshers Drive', type: 'JOB', deadline: '2026-11-18', location: 'Bengaluru' },
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
  history: [
    { weekKey: '2026-W45', finalScore: 78, tier: 'RARE', snapshotAt: '2026-11-08T06:00:00.000Z' },
    { weekKey: '2026-W44', finalScore: 70, tier: 'COMMON', snapshotAt: '2026-11-01T06:00:00.000Z' },
  ],
  latestGift: { tier: 'RARE', rewardRarity: 'RARE', status: 'ALLOCATED', weekKey: '2026-W45' },
};

const ACHIEVEMENTS = { success: true, summary: { totalEarned: 9, totalAvailable: 24, completionPercentage: 38, totalXp: 1450, currentStreak: 6, longestStreak: 12 }, badges: [] };
const REWARDS = { success: true, availableRewards: [{ id: 'r1', rewardType: 'MYSTERY_GIFT', rewardRarity: 'RARE', weeklyScore: 78, weeklyRank: 'RARE', personalizedMessage: 'Great week!', reasonEarned: 'Weekly career growth', allocatedAt: '2026-11-05T06:00:00.000Z' }] };
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
  [/^\/api\/sidebar$/, { data: SIDEBAR }],
  [/^\/api\/dashboard\/student$/, DASHBOARD],
  [/^\/api\/applications/, APPLICATIONS],
  [/^\/api\/tasks$/, []],
  [/^\/api\/interviews$/, INTERVIEWS],
  [/^\/api\/opportunities\/recommended$/, OPPORTUNITIES],
  [/^\/api\/opportunities$/, OPPORTUNITIES],
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
  [/^\/api\/settings$/, { success: true, data: { name: 'Aarav Sharma', email: 'aarav@example.com' } }],
  [/^\/api\/profiles\/me$/, { success: true, data: { name: 'Aarav Sharma' } }],
  [/^\/api\/notifications\/unread-count$/, { count: 0 }],
  [/^\/api\/notifications$/, { data: [] }],
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const DEVICES = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];

async function mockContext(browser, device) {
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
  return context;
}

// Sidebar containers:
//  - desktop (>=1024px): the hover-expandable <aside aria-label="Main sidebar navigation">
//  - tablet/mobile: the spring drawer <aside> without an aria-label
function sidebarSel(device) {
  return device.width >= 1024
    ? 'aside[aria-label="Main sidebar navigation"]'
    : 'aside:not([aria-label])';
}

async function openSidebarIfNeeded(page, device) {
  if (device.width >= 1024) return;
  const burger = page.locator('button:has-text("Open sidebar")').first();
  if (await burger.count()) {
    await burger.click();
    await page.waitForTimeout(600);
  }
}

async function run() {
  const browser = await chromium.launch();
  const consoleErrors = [];

  for (const device of DEVICES) {
    const context = await mockContext(browser, device);
    const page = await context.newPage();
    page.on('pageerror', (e) => consoleErrors.push(`[${device.name}] ${e.message}`));

    await page.goto(`${BASE}/dashboard/student`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Career Readiness Score', { timeout: 30000 });
    await page.waitForTimeout(2500);

    await openSidebarIfNeeded(page, device);
    const sel = sidebarSel(device);

    if (PHASE === 'before') {
      await page.screenshot({ path: path.join(OUT, `sidebar-before-${device.name}.png`) });
      await context.close();
      continue;
    }

    // ── Grouping / section labels ──────────────────────────────────────────
    const labels = await page.$$eval(`${sel} p`, (ps) =>
      ps.map((p) => (p.textContent || '').trim()).filter(Boolean)
    );
    check(`${device.name}: section labels rendered`, ['Main Menu', 'Rewards', 'Account'].every((l) => labels.includes(l)), labels.join(' | '));

    // ── Nav items (scoped to sidebar only) ────────────────────────────────
    const items = await page.$$eval(`${sel} a`, (as) =>
      as
        .map((a) => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') }))
        .filter((i) => i.text && i.text !== 'CareerAI')
    );
    const titles = items.map((i) => i.text);

    for (const expected of ['Overview', 'Explore Opportunities', 'My Applications', 'My Resume', 'Career Progress', 'Achievements', 'Rewards & Inventory', 'Coin Shop', 'Tokens', 'My Profile', 'Settings']) {
      check(`${device.name}: nav has "${expected}"`, titles.includes(expected));
    }
    check(`${device.name}: "Career Growth" removed from sidebar`, !titles.includes('Career Growth'));
    check(`${device.name}: "Career Leaderboard" removed from sidebar`, !titles.includes('Career Leaderboard'));
    check(`${device.name}: no legacy "Opportunities"/"My Progress" titles`, !titles.includes('Opportunities') && !titles.includes('My Progress'));

    const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
    check(`${device.name}: no duplicate nav items`, dupes.length === 0, dupes.join(','));
    check(`${device.name}: exactly ${NEW_SIDEBAR.length} nav items`, items.length === NEW_SIDEBAR.length, `count=${items.length}`);

    // Order check (Main Menu -> Rewards -> Account)
    const ordered = ['Overview', 'Explore Opportunities', 'My Applications', 'My Resume', 'Career Progress', 'Achievements', 'Rewards & Inventory', 'Coin Shop', 'Tokens', 'My Profile', 'Settings'];
    check(`${device.name}: nav order matches spec`, JSON.stringify(titles) === JSON.stringify(ordered), titles.join(' > '));

    // ── Active state (on Overview) ────────────────────────────────────────
    const activeCount = await page.$$eval(`${sel} a[aria-current="page"]`, (as) => as.length);
    const activeText = await page.$$eval(`${sel} a[aria-current="page"]`, (as) => as.map((a) => (a.textContent || '').trim()));
    check(`${device.name}: exactly one active nav item`, activeCount === 1, `count=${activeCount}`);
    check(`${device.name}: active item is Overview`, activeText[0] === 'Overview', activeText.join(','));

    // ── Responsive / overflow ─────────────────────────────────────────────
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${device.name}: no horizontal overflow`, overflow <= 1, `overflow=${overflow}px`);

    await page.screenshot({ path: path.join(OUT, `sidebar-after-${device.name}.png`) });
    await context.close();
  }

  // ── Route-by-route verification (desktop) ───────────────────────────────
  if (PHASE === 'after') {
    const context = await mockContext(browser, { width: 1440, height: 1000 });
    const page = await context.newPage();
    page.on('pageerror', (e) => consoleErrors.push(`[routes] ${e.message}`));

    const ROUTE_EXPECT = [
      ['/dashboard/student', 'Career Readiness Score'],
      ['/dashboard/student/opportunities', 'Opportunit'],
      ['/dashboard/student/applications', 'Application'],
      ['/resume', ''],
      ['/dashboard/student/progress', 'Career Growth'],
      ['/dashboard/student/achievements', ''],
      ['/dashboard/student/rewards', ''],
      ['/dashboard/student/shop', ''],
      ['/dashboard/student/tokens', ''],
      ['/profile', ''],
      ['/dashboard/settings', ''],
    ];

    // Warm-up: dev-mode compiles routes on demand, so visit each once first.
    for (const [route] of ROUTE_EXPECT) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
    }

    for (const [route, marker] of ROUTE_EXPECT) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3500);
      const url = new URL(page.url());
      const stayed = url.pathname === route;
      const body = (await page.textContent('body')) || '';
      const hasMarker = !marker || body.includes(marker);
      check(`route ${route} loads (no redirect)`, stayed, `landed on ${url.pathname}`);
      if (marker) check(`route ${route} renders expected content`, hasMarker, `marker="${marker}"`);
    }

    // Career Growth content accessible via Career Progress (merge requirement)
    await page.goto(`${BASE}/dashboard/student/progress`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    const progressBody = (await page.textContent('body')) || '';
    check('Career Progress: "Career Growth" tab present', /Career Growth/.test(progressBody));
    check('Career Progress: growth summary content rendered', /Weekly Career Growth/.test(progressBody) && /Resume Strength/.test(progressBody));

    // Leaderboard route still works when accessed directly
    await page.goto(`${BASE}/dashboard/student/leaderboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    const lbBody = (await page.textContent('body')) || '';
    check('leaderboard route works directly', /Priya Nair/.test(lbBody) || /Career Leaderboard/.test(lbBody));

    await context.close();

    // ── Mobile drawer close-after-navigation ──────────────────────────────
    {
      const mctx = await mockContext(browser, { width: 390, height: 844 });
      const mpage = await mctx.newPage();
      await mpage.goto(`${BASE}/dashboard/student`, { waitUntil: 'domcontentloaded' });
      await mpage.waitForSelector('text=Career Readiness Score', { timeout: 30000 });
      await mpage.waitForTimeout(2000);

      const burger = mpage.locator('button:has-text("Open sidebar")').first();
      await burger.click();
      await mpage.waitForTimeout(600);
      check('mobile: drawer opens', await mpage.locator('aside:not([aria-label])').count() > 0);

      await mpage.locator('aside:not([aria-label]) a:has-text("Career Progress")').first().click();
      await mpage.waitForTimeout(3500);
      check('mobile: navigates to Career Progress', new URL(mpage.url()).pathname === '/dashboard/student/progress', mpage.url());
      check('mobile: drawer closed after navigation', (await mpage.locator('aside:not([aria-label])').count()) === 0);

      // Touch target height
      await burger.click();
      await mpage.waitForTimeout(600);
      const h = await mpage.locator('aside:not([aria-label]) a:has-text("Overview")').first().boundingBox();
      check('mobile: touch target >= 40px', !!h && h.height >= 40, h ? `h=${Math.round(h.height)}` : 'no box');
      await mctx.close();
    }
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT, `verify-sidebar-${PHASE}-results.json`), JSON.stringify({ phase: PHASE, results, consoleErrors }, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n[${PHASE}] ${results.length - failed.length}/${results.length} checks passed.`);
  if (consoleErrors.length) console.log('Page errors:', consoleErrors.slice(0, 5));
  process.exit(failed.length ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
