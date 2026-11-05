/**
 * AI Career Platform — 30-Badge System Browser Verification (Playwright)
 * ---------------------------------------------------------------------
 * Drives a REAL browser against the running Next.js app and verifies the
 * professional badge gallery, the platform-issued credential flow, the public
 * verification page and admin authorization gating.
 *
 * It uses an ISOLATED, disposable test student and awards disposable badges via
 * the real `badgeEngine`, then removes every fixture at the end. It never
 * touches real students, real awards, real credentials or any cron.
 *
 * Run: npx tsx scripts/verify_badge_system_browser.ts
 * Env: APP_URL (default http://localhost:3000), JWT_SECRET (required)
 */
import 'dotenv/config';
import { chromium, Browser, BrowserContext, Page, APIRequestContext, request } from 'playwright';
import jwt from 'jsonwebtoken';
import * as path from 'path';
import * as fs from 'fs';
import prisma from '../lib/prisma';
import { badgeEngine } from '../lib/gamification/badgeEngine';
import { getBadgeById } from '../lib/gamification/badgeConfig';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not configured.');
}
const SECRET: string = JWT_SECRET;

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const ARTIFACT_DIR = path.join(process.cwd(), 'scripts', 'artifacts');

const CHROME_PATH = (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

// Two real catalog badges used as fixtures: one earned (credential flow) and one
// left locked (criteria-only detail view). Both are cleared in cleanup.
const EARNED_BADGE_ID = 'career-first-step';
const LOCKED_BADGE_ID = 'streak-unstoppable';

interface Check {
  name: string;
  passed: boolean;
  details?: string;
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    const exe = fs.existsSync(CHROME_PATH) ? CHROME_PATH : fs.existsSync(EDGE_PATH) ? EDGE_PATH : undefined;
    return await chromium.launch({ headless: true, executablePath: exe });
  }
}

async function run() {
  console.log('=====================================================================');
  console.log('  AI CAREER PLATFORM — 30-BADGE SYSTEM BROWSER VERIFICATION');
  console.log('=====================================================================\n');

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let studentId = '';
  let credentialId = '';
  const checks: Check[] = [];
  const consoleErrors: string[] = [];
  const httpErrors: string[] = [];
  const push = (name: string, passed: boolean, details?: string) => {
    checks.push({ name, passed, details });
    console.log(`  ${passed ? 'PASS' : 'FAIL'}: ${name}${details ? ` — ${details}` : ''}`);
  };

  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let api: APIRequestContext | null = null;

  const earnedBadge = getBadgeById(EARNED_BADGE_ID);
  const lockedBadge = getBadgeById(LOCKED_BADGE_ID);

  try {
    // ── 1. Isolated fixtures ────────────────────────────────────────────────
    const email = `badge.browser.${suffix}@aicareerplatform.test`;
    const student = await prisma.user.create({
      data: { name: `Badge Browser Student ${suffix}`, email, role: 'STUDENT', active: true },
    });
    studentId = student.id;

    const award = await badgeEngine.awardBadgeOnBehalf({
      studentId,
      badgeId: EARNED_BADGE_ID,
      source: 'MANUAL',
      reason: 'Browser verification fixture',
    });
    credentialId = award.credentialId || '';

    const token = jwt.sign({ sub: studentId, email, role: 'STUDENT' }, SECRET, { expiresIn: '1d' });
    const userObj = { id: studentId, name: student.name, email, role: 'STUDENT' };

    console.log(`Fixture student: ${email}`);
    console.log(`Awarded "${earnedBadge?.title}" — credential: ${credentialId}`);
    console.log(`Left locked: "${lockedBadge?.title}"\n`);

    if (!credentialId) throw new Error('Fixture award did not return a credential id.');

    // ── 2. Browser + API contexts ───────────────────────────────────────────
    browser = await launchBrowser();
    context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const t = msg.text();
        if (!t.includes('favicon') && !t.includes('Failed to load resource') && !t.includes('404 (Not Found)')) {
          consoleErrors.push(t);
        }
      }
    });
    page.on('pageerror', (err) => consoleErrors.push(`Uncaught: ${err.message}`));

    const HTTP_ALLOWLIST = ['/api/notifications/stream'];
    page.on('response', (r) => {
      const u = r.url();
      if (r.status() >= 400 && !HTTP_ALLOWLIST.some((a) => u.includes(a))) {
        httpErrors.push(`${r.status()} ${u.replace(APP_URL, '')}`);
      }
    });

    await page.addInitScript(
      ({ tokenVal, userVal }) => {
        localStorage.setItem('token', tokenVal);
        localStorage.setItem('user', JSON.stringify(userVal));
      },
      { tokenVal: token, userVal: userObj }
    );

    // ── 3. Badge gallery renders ────────────────────────────────────────────
    await page.goto(`${APP_URL}/dashboard/student/achievements`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.locator('h1:has-text("Achievements & Badges")').first().waitFor({ timeout: 45000 });
    await page.waitForTimeout(1500);

    push('Badge gallery page renders', await page.locator('h1:has-text("Achievements & Badges")').first().isVisible());

    for (const card of ['Earned badges', 'Verified XP', 'Career activity streak', 'Closest milestone']) {
      const visible = await page.locator(`text=${card}`).first().isVisible().catch(() => false);
      push(`Metric card "${card}" is present`, visible);
    }

    push('Category filter "All badges" is present', await page.locator('button:has-text("All badges")').first().isVisible().catch(() => false));
    for (const cat of ['Career Excellence', 'Innovation & Competition', 'Consistency & Streak', 'Professional Development', 'Monthly Excellence']) {
      const visible = await page.locator(`button:has-text("${cat}")`).first().isVisible().catch(() => false);
      push(`Category filter "${cat}" is present`, visible);
    }

    // Wait until the grid has hydrated with at least the earned badge card.
    const earnedCard = page.locator('button').filter({ hasText: earnedBadge!.title }).first();
    await earnedCard.waitFor({ timeout: 45000 }).catch(() => {});

    push('Earned badge card is listed', await earnedCard.isVisible().catch(() => false));
    push('Earned badge card shows "Earned" evidence', await earnedCard.locator('text=/Earned /').first().isVisible().catch(() => false));

    // Locked badge card present (search for it)
    await page.locator('input[placeholder="Search badges..."]').fill(lockedBadge!.title);
    await page.waitForTimeout(500);
    const lockedCard = page.locator('button').filter({ hasText: lockedBadge!.title }).first();
    push('Locked badge card is listed', await lockedCard.isVisible().catch(() => false));
    await page.locator('input[placeholder="Search badges..."]').fill('');
    await page.waitForTimeout(400);

    // ── 4. Category filter narrows the grid ─────────────────────────────────
    await page.locator('button:has-text("Consistency & Streak")').first().click();
    await page.waitForTimeout(600);
    const consistencyVisible = await page.locator('button').filter({ hasText: 'Consistency Starter' }).first().isVisible().catch(() => false);
    push('Filtering by category shows that category\'s badges', consistencyVisible);
    await page.locator('button:has-text("All badges")').first().click();
    await page.waitForTimeout(500);

    // ── 5. Earned badge detail modal — credential panel ─────────────────────
    await earnedCard.click();
    await page.waitForTimeout(700);
    push('Detail modal shows "How it is earned"', await page.locator('text=How it is earned').first().isVisible().catch(() => false));
    push('Detail modal shows platform-issued credential panel', await page.locator('text=Platform-issued achievement credential').first().isVisible().catch(() => false));
    push('Credential panel shows the credential id', await page.locator(`text=${credentialId}`).first().isVisible().catch(() => false));
    push('Credential panel shows "Status: valid"', await page.locator('text=Status: valid').first().isVisible().catch(() => false));
    push('Credential panel links to the public verification page', await page.locator('a:has-text("Public verification page")').first().isVisible().catch(() => false));

    const linkedIn = page.locator('a:has-text("Add to LinkedIn profile")').first();
    const linkedInVisible = await linkedIn.isVisible().catch(() => false);
    const linkedInHref = linkedInVisible ? (await linkedIn.getAttribute('href')) || '' : '';
    push('Earned badge offers a LinkedIn "Add to profile" action', linkedInVisible);
    push(
      'LinkedIn URL is prefilled with org + credential id',
      linkedInHref.includes('linkedin.com/profile/add') && linkedInHref.includes(encodeURIComponent(credentialId)),
      linkedInHref.slice(0, 120)
    );

    await page.screenshot({ path: path.join(ARTIFACT_DIR, `badge_detail_${suffix}.png`), fullPage: false });
    // Close the modal by clicking the backdrop overlay (outside the dialog card).
    await page.mouse.click(8, 8);
    await page.waitForTimeout(500);
    const modalClosed = !(await page.locator('text=How it is earned').first().isVisible().catch(() => false));
    push('Detail modal closes via the backdrop', modalClosed);

    // ── 6. Locked badge detail modal — criteria only, no credential ──────────
    await page.locator('input[placeholder="Search badges..."]').fill(lockedBadge!.title);
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: lockedBadge!.title }).first().click();
    await page.waitForTimeout(700);
    push('Locked badge modal shows the earning criteria', await page.locator('text=How it is earned').first().isVisible().catch(() => false));
    push('Locked badge has no credential panel (no false credential)', !(await page.locator('text=Platform-issued achievement credential').first().isVisible().catch(() => false)));
    await page.mouse.click(8, 8);
    await page.waitForTimeout(400);

    // Full-page gallery screenshot (desktop)
    const desktopShot = path.join(ARTIFACT_DIR, `badge_gallery_desktop_${suffix}.png`);
    await page.screenshot({ path: desktopShot, fullPage: true });
    console.log(`\nDesktop gallery screenshot: ${desktopShot}`);

    // ── 7. Public credential verification page ──────────────────────────────
    const verifyUrl = `${APP_URL}/verify/${credentialId}`;
    await page.goto(verifyUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(600);
    push('Public verification page loads', await page.locator('text=AI Career Platform · Credential Verification').first().isVisible().catch(() => false));
    push('Verification page shows "Verified credential"', await page.locator('text=Verified credential').first().isVisible().catch(() => false));
    push('Verification page shows badge title', await page.locator(`h1:has-text("${earnedBadge!.title}")`).first().isVisible().catch(() => false));
    push('Verification page shows issuing organization', await page.locator('text=AI Career Platform').first().isVisible().catch(() => false));
    push('Verification page shows the credential id', await page.locator(`text=${credentialId}`).first().isVisible().catch(() => false));
    push('Verification page states it is not external accreditation', await page.locator('text=/not an external/').first().isVisible().catch(() => false));
    const verifyBody = (await page.locator('body').innerText()).toLowerCase();
    push('Verification page exposes no student email', !verifyBody.includes(email.toLowerCase()));

    const verifyShot = path.join(ARTIFACT_DIR, `badge_verify_${suffix}.png`);
    await page.screenshot({ path: verifyShot, fullPage: true });
    console.log(`Verification page screenshot: ${verifyShot}`);

    // ── 8. Unknown credential id → not found ────────────────────────────────
    await page.goto(`${APP_URL}/verify/ACP-UNKNOWN-0000000000`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(500);
    push('Unknown credential shows "Credential not found"', await page.locator('text=Credential not found').first().isVisible().catch(() => false));

    // ── 9. Credential API (public) ──────────────────────────────────────────
    api = await request.newContext({ baseURL: APP_URL });
    const okRes = await api.get(`/api/credentials/${credentialId}`);
    const okJson = await okRes.json().catch(() => ({}));
    push('Credential API returns 200 + found=true for a valid id', okRes.status() === 200 && okJson.found === true, `status=${okRes.status()}`);
    push('Credential API does not leak the student email', !JSON.stringify(okJson).toLowerCase().includes(email.toLowerCase()));

    const missingRes = await api.get('/api/credentials/ACP-UNKNOWN-0000000000');
    const missingJson = await missingRes.json().catch(() => ({}));
    push('Credential API returns found=false for an unknown id', missingJson.found === false, `status=${missingRes.status()}`);

    const malformedRes = await api.get('/api/credentials/not-a-credential');
    push('Credential API rejects a malformed id (400)', malformedRes.status() === 400, `status=${malformedRes.status()}`);

    // ── 10. Admin authorization gating ──────────────────────────────────────
    const anonGet = await api.get('/api/admin/gamification/badges');
    push('Admin badge catalog blocks anonymous access (401)', anonGet.status() === 401, `status=${anonGet.status()}`);

    const studentGet = await api.get('/api/admin/gamification/badges', { headers: { Authorization: `Bearer ${token}` } });
    push('Admin badge catalog blocks a student token (403)', studentGet.status() === 403, `status=${studentGet.status()}`);

    const studentGrant = await api.post('/api/admin/gamification/badges', {
      headers: { Authorization: `Bearer ${token}` },
      data: { action: 'grant', studentId, badgeId: LOCKED_BADGE_ID, reason: 'self-grant attempt' },
    });
    push('Student cannot self-grant a badge (403)', studentGrant.status() === 403, `status=${studentGrant.status()}`);

    const studentMonthly = await api.post('/api/admin/gamification/monthly-recognition', {
      headers: { Authorization: `Bearer ${token}` },
      data: { monthKey: '2026-01' },
    });
    push('Student cannot trigger monthly recognition (403)', studentMonthly.status() === 403, `status=${studentMonthly.status()}`);

    // ── 11. Mobile gallery ──────────────────────────────────────────────────
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobilePage = await mobile.newPage();
    await mobilePage.addInitScript(
      ({ tokenVal, userVal }) => {
        localStorage.setItem('token', tokenVal);
        localStorage.setItem('user', JSON.stringify(userVal));
      },
      { tokenVal: token, userVal: userObj }
    );
    await mobilePage.goto(`${APP_URL}/dashboard/student/achievements`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await mobilePage.locator('h1:has-text("Achievements & Badges")').first().waitFor({ timeout: 45000 });
    await mobilePage.waitForTimeout(1500);
    const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    push('Mobile gallery has no horizontal overflow', overflow <= 2, `overflow=${overflow}px`);
    const mobileShot = path.join(ARTIFACT_DIR, `badge_gallery_mobile_${suffix}.png`);
    await mobilePage.screenshot({ path: mobileShot, fullPage: true });
    console.log(`Mobile gallery screenshot: ${mobileShot}`);
    await mobile.close();

    // ── 12. Revocation is reflected publicly ────────────────────────────────
    const revoke = await badgeEngine.revokeBadge({
      studentId,
      badgeId: EARNED_BADGE_ID,
      reason: 'Browser verification — revocation check',
      source: 'MANUAL',
    });
    push('Revoking a badge succeeds', revoke.ok === true, revoke.error || '');

    await page.goto(verifyUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(500);
    push('Revoked credential shows "Credential revoked"', await page.locator('text=Credential revoked').first().isVisible().catch(() => false));

    // ── 13. No unexpected errors ────────────────────────────────────────────
    push(
      'No unexpected client errors or failed API calls',
      consoleErrors.length === 0 && httpErrors.length === 0,
      [...consoleErrors, ...httpErrors].slice(0, 3).join(' | ')
    );
  } catch (err: any) {
    push('Browser verification completed without a fatal error', false, err?.message);
  } finally {
    if (api) await api.dispose().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});

    // ── Cleanup (isolated fixtures only) ────────────────────────────────────
    try {
      if (studentId) {
        await prisma.studentBadge.deleteMany({ where: { studentId } });
        await prisma.badgeAwardAudit.deleteMany({ where: { studentId } });
        await prisma.achievementHistory.deleteMany({ where: { studentId } });
        await prisma.pointsLedger.deleteMany({ where: { studentId } }).catch(() => {});
        await prisma.studentDailyStreak.deleteMany({ where: { studentId } });
        await prisma.user.delete({ where: { id: studentId } });
      }
      console.log('Cleaned up isolated test fixtures.');
    } catch (cleanupErr: any) {
      console.error('Cleanup warning:', cleanupErr?.message);
    }
    await prisma.$disconnect();
  }

  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  console.log('\n=====================================================================');
  console.log(`  BADGE BROWSER VERIFICATION RESULT: ${passed}/${total} checks passed`);
  console.log('=====================================================================');
  if (passed !== total) {
    console.log('Failed checks:');
    checks.filter((c) => !c.passed).forEach((c) => console.log(`  FAIL: ${c.name}${c.details ? ` — ${c.details}` : ''}`));
  }
  process.exit(passed === total ? 0 : 1);
}

run();
