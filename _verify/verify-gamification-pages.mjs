// Playwright verification for "Move Gamification Details into Dedicated Sidebar Pages".
// Mocks all /api/** so no real data / production DB is touched (isolated test data).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3210';
const OUT = path.resolve('_verify/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const USER = { id: 'test-student-1', name: 'Aarav Sharma', email: 'aarav@example.com', role: 'STUDENT' };

// Full canonical student sidebar (mirrors lib/initializeDefaults.ts after the change).
const SIDEBAR = [
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
];

const INTERVIEWS = [
  { id: 'i1', companyName: 'Google', position: 'STEP Intern', date: '2026-11-12', result: 'Pending' },
  { id: 'i2', companyName: 'Microsoft', position: 'SWE Intern', date: '2026-11-20', result: 'Pending' },
];

const OPPORTUNITIES = [
  { id: 'o1', companyName: 'Unstop', organization: 'Unstop', role: 'Summer Internship 2026', title: 'Summer Internship 2026', type: 'INTERNSHIP', deadline: '2026-11-09', location: 'Remote' },
  { id: 'o2', companyName: 'Infosys', organization: 'Infosys', role: 'Freshers Drive', title: 'Freshers Drive', type: 'JOB', deadline: '2026-11-18', location: 'Bengaluru' },
  { id: 'o3', companyName: 'HackerEarth', organization: 'HackerEarth', role: 'Code Sprint', title: 'Code Sprint', type: 'HACKATHON', deadline: '2026-11-25', location: 'Online' },
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

const TOKEN_INVENTORY = {
  streakRescue: {
    available: [{ id: 'tk1', awardedAt: '2026-11-01T06:00:00.000Z', expiresAt: '2026-12-31T06:00:00.000Z' }],
    usedCount: 1,
    expiredCount: 0,
    eligibleDates: ['2026-10-28'],
    rulesEnabled: true,
  },
  leaderboardBoost: {
    available: [],
    usedCount: 0,
    expiredCount: 0,
    status: { available: false, reason: 'No meaningful career use case yet.', activeDays: 0, rankingNeutral: true },
  },
};

const INVENTORY = {
  success: true,
  balance: { totalXp: 1450, availableCoins: 240, totalBadges: 9, totalRewards: 2 },
  gifts: {
    available: [{ id: 'g1', rewardRarity: 'RARE', allocatedAt: '2026-11-05T06:00:00.000Z' }],
    claimed: [{ id: 'g2', rewardRarity: 'COMMON', claimedAt: '2026-10-28T06:00:00.000Z' }],
  },
  tokens: TOKEN_INVENTORY,
  cosmetics: {
    frames: [{ rewardDefId: 'f1', name: 'Gold Frame', url: 'x', rarity: 'RARE', source: 'SHOP', equipped: false }],
    titles: [],
    badges: [],
    showcaseBadgeIds: [],
  },
  coinHistory: [{ id: 'c1', amount: 50, transactionType: 'REWARD_CREDIT', reason: 'Weekly gift', createdAt: '2026-11-05T06:00:00.000Z', newBalance: 240 }],
  purchaseHistory: [
    { id: 'p1', itemName: 'Neon Frame', itemType: 'FRAME', itemValue: 'x', coinPrice: 100, status: 'ACTIVE', createdAt: '2026-11-02T06:00:00.000Z', refundedAt: null },
  ],
};

const SHOP = {
  success: true,
  balance: 240,
  items: [
    { id: 'si1', name: 'Neon Frame', description: 'A glowing profile frame', itemType: 'FRAME', coinPrice: 100, itemValue: 'x', rewardType: 'PROFILE_FRAME', rarity: 'RARE', purchaseLimit: 1, owned: false },
    { id: 'si2', name: 'Veteran Title', description: 'Show off your experience', itemType: 'TITLE', coinPrice: 80, itemValue: 'Veteran', rewardType: 'PROFILE_TITLE', rarity: 'COMMON', purchaseLimit: 1, owned: false },
  ],
};

const ROUTES = [
  [/^\/api\/auth\/me$/, { data: USER }],
  [/^\/api\/sidebar$/, { data: SIDEBAR }],
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
  [/^\/api\/gamification\/tokens\/streak-rescue$/, { success: true, message: 'Streak restored' }],
  [/^\/api\/gamification\/tokens\/leaderboard-boost$/, { success: false, message: 'Not available' }],
  [/^\/api\/gamification\/tokens$/, { success: true, ...TOKEN_INVENTORY }],
  [/^\/api\/shop\/purchase$/, { success: true, alreadyApplied: false, purchaseId: 'np1', itemName: 'Neon Frame', coinPrice: 100, newBalance: 140 }],
  [/^\/api\/shop$/, SHOP],
  [/^\/api\/profile\/customization$/, { success: true, cosmetics: INVENTORY.cosmetics }],
  [/^\/api\/notifications\/unread-count$/, { count: 0 }],
  [/^\/api\/notifications$/, { data: [] }],
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function attachMocks(context, requests) {
  return context.route('**/api/**', (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === '/api/notifications/stream') return route.abort();
    if (requests) requests.push({ method: req.method(), path: url.pathname });
    for (const [re, body] of ROUTES) {
      if (re.test(url.pathname)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}

async function seedAuth(context) {
  await context.addInitScript((u) => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify(u));
  }, USER);
}

const NEW_ROUTES = [
  { path: '/dashboard/student/growth', name: 'Weekly Career Growth', expect: ['Weekly Career Growth', 'Weekly Snapshot History'] },
  { path: '/dashboard/student/shop', name: 'Coin Shop', expect: ['Coin Shop', 'Purchase History', 'Neon Frame'] },
  { path: '/dashboard/student/rewards', name: 'Rewards & Inventory', expect: ['Rewards & Inventory', 'Reward Inventory'] },
  { path: '/dashboard/student/tokens', name: 'Tokens', expect: ['Tokens', 'Streak Rescue Tokens'] },
  { path: '/dashboard/student/leaderboard', name: 'Career Leaderboard', expect: ['Career Leaderboard', 'Top performers by career growth'] },
];

async function run() {
  const browser = await chromium.launch();
  const consoleErrors = [];

  for (const device of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport: { width: device.width, height: device.height } });
    await seedAuth(context);
    await attachMocks(context);
    const page = await context.newPage();
    page.on('pageerror', (e) => consoleErrors.push(`[${device.name}] ${e.message}`));

    // ── 1. Student Overview ────────────────────────────────────
    await page.goto(`${BASE}/dashboard/student`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Career Readiness Score', { timeout: 25000 });
    await page.waitForTimeout(2500);

    const body = (await page.textContent('body')) || '';
    const rightHtml = await page.evaluate(() => {
      const el = document.querySelector('.dash-right-sidebar');
      return el ? el.innerHTML : '';
    });

    // Kept sections
    check(`${device.name}: welcome banner`, /, Aarav!/.test(body));
    check(`${device.name}: career readiness`, /Career Readiness Score/.test(body) && /Career Readiness: 85%/.test(body));
    check(`${device.name}: application metrics`, /My Applications/.test(body));
    check(`${device.name}: upcoming interviews`, /Upcoming Interviews/.test(body));
    check(`${device.name}: deadlines`, /Deadlines/.test(body) && /Upcoming Deadlines/.test(body));

    // Compact XP/Coins summary kept
    check(`${device.name}: compact XP summary kept`, /1,450/.test(body) && /240/.test(body));

    // Removed detailed widgets (scoped to right sidebar container)
    check(`${device.name}: no Career Growth card in sidebar`, !/Weekly Career Growth/.test(rightHtml));
    check(`${device.name}: no Coin Shop in sidebar`, !/Coin Shop/.test(rightHtml));
    check(`${device.name}: no Reward Inventory in sidebar`, !/Reward Inventory/.test(rightHtml));
    check(`${device.name}: no Career Leaderboard in sidebar`, !/Career Leaderboard/.test(rightHtml));
    check(`${device.name}: no token management in sidebar`, !/Streak Rescue Tokens/.test(rightHtml));
    check(`${device.name}: token tab removed from sidebar`, !/^\s*Tokens\s*$/m.test(rightHtml.replace(/<[^>]*>/g, ' ')) || !/Tokens/.test(rightHtml));
    check(`${device.name}: IRP removed`, !/\bIRP\b/.test(body));
    check(`${device.name}: Refer & Earn removed`, !/Refer & Earn/.test(body));

    await page.screenshot({ path: path.join(OUT, `overview-${device.name}.png`), fullPage: true });

    // ── 2. Sidebar navigation ──────────────────────────────────
    if (device.name === 'mobile') {
      await page.click('button:has-text("Open sidebar")');
      await page.waitForTimeout(600);
    } else {
      await page.hover('aside[aria-label="Main sidebar navigation"]');
      await page.waitForTimeout(400);
    }
    const navLabels = await page.evaluate((isMobile) => {
      const sel = isMobile
        ? 'aside:not([aria-label]) a'
        : 'aside[aria-label="Main sidebar navigation"] a';
      return Array.from(document.querySelectorAll(sel))
        .map((a) => (a.textContent || '').trim())
        .filter((t) => t && t !== 'CareerAI');
    }, device.name === 'mobile');
    const uniq = new Set(navLabels);
    check(`${device.name}: no duplicate sidebar items`, uniq.size === navLabels.length, `count=${navLabels.length}`);
    for (const item of ['Career Growth', 'Rewards & Inventory', 'Coin Shop', 'Tokens', 'Career Leaderboard']) {
      check(`${device.name}: sidebar has "${item}"`, navLabels.includes(item));
    }
    await page.screenshot({ path: path.join(OUT, `sidebar-${device.name}.png`) });

    await context.close();
  }

  // ── 3. Each dedicated route (desktop) ────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await seedAuth(context);
    await attachMocks(context);
    const page = await context.newPage();
    page.on('pageerror', (e) => consoleErrors.push(`[route] ${e.message}`));

    for (const r of NEW_ROUTES) {
      await page.goto(`${BASE}${r.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const body = (await page.textContent('body')) || '';
      const url = page.url();
      check(`route ${r.path}: not redirected`, url.endsWith(r.path), url);
      for (const exp of r.expect) {
        check(`route ${r.path}: renders "${exp}"`, body.includes(exp));
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`route ${r.path}: no horizontal overflow`, overflow <= 1, `overflow=${overflow}px`);
      await page.screenshot({ path: path.join(OUT, `page${r.path.replace(/\//g, '-')}.png`), fullPage: true });
    }

    // Active-page highlight (aria-current on desktop)
    await page.goto(`${BASE}/dashboard/student/shop`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.hover('aside[aria-label="Main sidebar navigation"]');
    await page.waitForTimeout(400);
    const activeHref = await page.evaluate(() => {
      const el = document.querySelector('a[aria-current="page"]');
      return el ? el.getAttribute('href') : null;
    });
    check('active page highlight follows route', activeHref === '/dashboard/student/shop', String(activeHref));

    await context.close();
  }

  // ── 4. Actions still work (purchase + token) ─────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await seedAuth(context);
    const requests = [];
    await attachMocks(context, requests);
    const page = await context.newPage();
    page.on('pageerror', (e) => consoleErrors.push(`[action] ${e.message}`));

    // Purchase
    await page.goto(`${BASE}/dashboard/student/shop`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Neon Frame', { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.click('button:has-text("Buy")');
    await page.waitForTimeout(1500);
    check('shop: purchase POST issued', requests.some((r) => r.method === 'POST' && r.path === '/api/shop/purchase'));
    check('shop: purchase success toast', /Purchased Neon Frame/.test((await page.textContent('body')) || ''));

    // Token rescue
    requests.length = 0;
    await page.goto(`${BASE}/dashboard/student/tokens`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Streak Rescue Tokens', { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.click('button:has-text("Use")');
    await page.waitForTimeout(1500);
    check('tokens: streak-rescue POST issued', requests.some((r) => r.method === 'POST' && r.path === '/api/gamification/tokens/streak-rescue'));
    check('tokens: rescue success toast', /Streak restored/.test((await page.textContent('body')) || ''));

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
