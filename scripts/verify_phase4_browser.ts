/**
 * ATLYX Phase 4 — Browser Verification (Playwright)
 * ---------------------------------------------------------------------------
 * Drives a REAL browser against the running Next.js app and verifies the
 * student-facing Reward Inventory + Coin Shop reachable at /dashboard/student.
 *
 * It uses an ISOLATED, disposable test student, a disposable test shop item and
 * an isolated test coin grant, all created with a unique run suffix and fully
 * removed at the end. It never touches real students, real rewards, or any cron.
 *
 * Run: npx tsx scripts/verify_phase4_browser.ts
 * Env: APP_URL (default http://localhost:3000), JWT_SECRET (required)
 */
import 'dotenv/config';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import jwt from 'jsonwebtoken';
import * as path from 'path';
import * as fs from 'fs';
import prisma from '../lib/prisma';
import { applyCoinMutation } from '../lib/gamification/coinLedger';
import { getFormattedDateInTz } from '../lib/gamification/checkInService';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not configured.');
}
const SECRET: string = JWT_SECRET;

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const ARTIFACT_DIR = path.join(process.cwd(), 'scripts', 'artifacts');

const CHROME_PATH = (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

interface Check {
  name: string;
  passed: boolean;
  details?: string;
}

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + delta * 86_400_000;
  const nd = new Date(t);
  return `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, '0')}-${String(
    nd.getUTCDate()
  ).padStart(2, '0')}`;
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
  console.log('  ATLYX PHASE 4 — BROWSER VERIFICATION (Reward Inventory + Coin Shop)');
  console.log('=====================================================================\n');

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let studentId = '';
  let rewardDefId = '';
  const checks: Check[] = [];
  const consoleErrors: string[] = [];
  const httpErrors: string[] = [];
  const apiLog: string[] = [];
  const push = (name: string, passed: boolean, details?: string) => {
    checks.push({ name, passed, details });
    console.log(`  ${passed ? 'PASS' : 'FAIL'}: ${name}${details ? ` — ${details}` : ''}`);
  };

  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let screenshotPath = '';

  try {
    // ── 1. Isolated fixtures ────────────────────────────────────────────────
    const email = `phase4.browser.${suffix}@atlyx.test`;
    const itemName = `Browser Test Frame ${suffix}`;
    const student = await prisma.user.create({
      data: { name: `Phase4 Browser Student ${suffix}`, email, role: 'STUDENT', active: true },
    });
    studentId = student.id;

    const frame = await prisma.rewardDefinition.create({
      data: {
        rewardType: 'PROFILE_FRAME',
        rewardRarity: 'RARE',
        name: itemName,
        description: 'Phase4 browser verification frame',
        profileFrameUrl: `https://cdn.atlyx.test/frames/${suffix}.png`,
        isShopItem: true,
        shopCategory: 'FRAME',
        coinPrice: 100,
        purchaseLimit: 1,
        enabled: true,
      },
    });
    rewardDefId = frame.id;

    await applyCoinMutation({
      studentId,
      amount: 500,
      transactionType: 'BONUS',
      reason: 'Phase4 browser verification seed',
      idempotencyKey: `phase4_browser_seed_${suffix}`,
    });

    // Real career-activity streak with a gap tomorrow-that-was, so a genuine
    // eligible missed date exists (derived, never hardcoded to "yesterday").
    const today = getFormattedDateInTz();
    const streakDays = [2, 3, 4, 5, 6].map((i) => addDays(today, -i));
    for (const activityDate of streakDays) {
      await prisma.studentDailyStreak.create({
        data: { studentId, activityDate, activityType: 'CHECK_IN', qualifyingScore: 1.0 },
      });
    }
    const rescueToken = await prisma.streakRescueToken.create({
      data: {
        studentId,
        missedDate: addDays(today, -1),
        eligibleDate: addDays(today, -1),
        isUsed: false,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });

    const token = jwt.sign({ sub: studentId, email, role: 'STUDENT' }, SECRET, { expiresIn: '1d' });
    const userObj = { id: studentId, name: student.name, email, role: 'STUDENT' };

    console.log(`Fixtures ready: ${email}`);
    console.log(`Shop item: "${itemName}" (100 coins) | rescue token: ${rescueToken.id}\n`);

    // ── 2. Browser ──────────────────────────────────────────────────────────
    browser = await launchBrowser();
    context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const t = msg.text();
        // Generic network-failure lines carry no URL; those are correlated by
        // URL in the response handler below. Only keep genuine script errors.
        if (!t.includes('favicon') && !t.includes('Failed to load resource') && !t.includes('404 (Not Found)')) {
          consoleErrors.push(t);
        }
      }
    });
    page.on('pageerror', (err) => consoleErrors.push(`Uncaught: ${err.message}`));

    // Pre-existing, unrelated endpoints that legitimately 4xx for a synthetic
    // test user and are NOT part of the Phase 4 surface.
    const HTTP_ALLOWLIST = ['/api/notifications/stream'];

    page.on('response', async (r) => {
      const u = r.url();
      if (u.includes('/api/gamification/tokens/streak-rescue') || u.includes('/api/shop/purchase') || u.includes('/api/profile/customization')) {
        const body = await r.text().catch(() => '');
        apiLog.push(`${r.status()} ${u.replace(APP_URL, '')} -> ${body.slice(0, 220)}`);
      }
      if (r.status() >= 400 && !HTTP_ALLOWLIST.some((a) => u.includes(a))) {
        httpErrors.push(`${r.status()} ${u.replace(APP_URL, '')}`);
        console.log(`    [http ${r.status()}] ${u.replace(APP_URL, '')}`);
      }
    });

    await page.addInitScript(
      ({ tokenVal, userVal }) => {
        localStorage.setItem('token', tokenVal);
        localStorage.setItem('user', JSON.stringify(userVal));
      },
      { tokenVal: token, userVal: userObj }
    );

    await page.goto(`${APP_URL}/dashboard/student`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for the Reward Inventory card to hydrate.
    await page.locator('h2:has-text("Reward Inventory")').first().waitFor({ timeout: 45000 });
    await page.waitForTimeout(1500);

    // ── 3. Reward Inventory renders with all tabs ───────────────────────────
    push('Reward Inventory card renders', await page.locator('h2:has-text("Reward Inventory")').first().isVisible());
    for (const tab of ['Balance', 'Gifts', 'Tokens', 'Cosmetics', 'History']) {
      const visible = await page.locator(`button:has-text("${tab}")`).first().isVisible().catch(() => false);
      push(`Inventory tab "${tab}" is present`, visible);
    }

    // ── 4. Coin Shop renders with the server-priced item ────────────────────
    const shopHeading = page.locator('h2:has-text("Coin Shop")').first();
    push('Coin Shop card renders', await shopHeading.isVisible().catch(() => false));

    const itemCard = page.locator('div.rounded-xl').filter({ hasText: itemName }).first();
    push('Shop item is listed', await itemCard.isVisible().catch(() => false));

    const buyBtn = itemCard.locator('button').first();
    const buyLabel = (await buyBtn.textContent().catch(() => ''))?.trim() || '';
    push('Shop item shows a Buy action with server price', buyLabel === 'Buy', `button="${buyLabel}"`);

    // ── 5. Purchase flow (server-priced, ownership recorded) ────────────────
    await buyBtn.click();
    const ownedOk = await itemCard
      .locator('button:has-text("Owned")')
      .first()
      .waitFor({ timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    push('Purchasing the item marks it as Owned', ownedOk);

    const purchaseRow = await prisma.shopPurchase.findFirst({ where: { studentId, rewardDefId } });
    push('Purchase row persisted server-side', Boolean(purchaseRow), purchaseRow ? `id=${purchaseRow.id}` : 'no row');
    push(
      'Purchase charged the server-side price (100)',
      purchaseRow?.coinPrice === 100,
      `charged=${purchaseRow?.coinPrice}`
    );

    // ── 6. Tokens tab — Streak Rescue available, Boost unavailable ──────────
    await page.locator('button:has-text("Tokens")').first().click();
    await page.waitForTimeout(800);
    push('Tokens tab shows "Streak Rescue Tokens"', await page.locator('h3:has-text("Streak Rescue Tokens")').first().isVisible().catch(() => false));
    push('Tokens tab shows "Leaderboard Boost Tokens"', await page.locator('h3:has-text("Leaderboard Boost Tokens")').first().isVisible().catch(() => false));
    const boostNotice = await page.locator('text=Currently unavailable').first().isVisible().catch(() => false);
    push('Leaderboard Boost is reported as unavailable (ranking protected)', boostNotice);
    const boostReason = await page
      .locator('text=/must never be altered|ranking/i')
      .first()
      .textContent()
      .catch(() => '');
    push('Boost unavailability reason explains ranking protection', Boolean(boostReason && boostReason.length > 10), (boostReason || '').slice(0, 80));

    // ── 7. Streak rescue action through the UI ──────────────────────────────
    const useBtn = page.locator('button:has-text("Use")').first();
    const hasUse = await useBtn.isVisible().catch(() => false);
    push('An available Streak Rescue token offers a "Use" action', hasUse);
    if (hasUse) {
      await useBtn.click();
      await page.waitForTimeout(2500);
      console.log(`    [api] ${apiLog.filter((l) => l.includes('streak-rescue')).join(' || ') || '(no rescue request seen)'}`);
      const usedCount = await prisma.streakRescueToken.count({ where: { studentId, isUsed: true } });
      push('Using the token consumes it (Used = 1)', usedCount === 1, `usedCount=${usedCount}`);
      const restored = await prisma.studentDailyStreak.findFirst({
        where: { studentId, activityType: 'STREAK_RESCUE' },
      });
      push('Streak day restored atomically as STREAK_RESCUE', Boolean(restored), restored?.activityDate || 'none');
    }

    // ── 8. Cosmetics tab — equip the owned frame ────────────────────────────
    await page.locator('button:has-text("Cosmetics")').first().click();
    await page.waitForTimeout(800);
    push('Cosmetics tab shows "Frames" section', await page.locator('h3:has-text("Frames")').first().isVisible().catch(() => false));
    push('Cosmetics tab shows "Titles" section', await page.locator('h3:has-text("Titles")').first().isVisible().catch(() => false));
    push('Cosmetics tab shows "Badges" section', await page.locator('h3:has-text("Badges")').first().isVisible().catch(() => false));

    const inventoryCard = page
      .locator('div.rounded-2xl')
      .filter({ has: page.locator('h2:has-text("Reward Inventory")') })
      .first();
    const frameRow = inventoryCard.locator('div.rounded-xl').filter({ hasText: itemName }).first();
    const equipBtn = frameRow.locator('button').first();
    const hasEquip = await equipBtn.isVisible().catch(() => false);
    push('Owned frame offers an Equip action', hasEquip);
    if (hasEquip) {
      await equipBtn.click();
      await page.waitForTimeout(2500);
      console.log(`    [api] ${apiLog.filter((l) => l.includes('customization')).join(' || ') || '(no customization request seen)'}`);
      const profile = await prisma.profile.findUnique({ where: { userId: studentId } });
      push('Equipped frame persisted to the profile', profile?.equippedFrameRewardId === rewardDefId, `equippedFrameRewardId=${profile?.equippedFrameRewardId}`);
    }

    // ── 9. History tab — coin ledger + purchase history ─────────────────────
    await page.locator('button:has-text("History")').first().click();
    await page.waitForTimeout(800);
    push('History tab shows "Coin Transactions"', await page.locator('h3:has-text("Coin Transactions")').first().isVisible().catch(() => false));
    push('History tab shows "Purchase History"', await page.locator('h3:has-text("Purchase History")').first().isVisible().catch(() => false));
    push('Purchase History lists the purchased item', await page.locator(`text=${itemName}`).first().isVisible().catch(() => false));

    // ── 10. Screenshot evidence ─────────────────────────────────────────────
    screenshotPath = path.join(ARTIFACT_DIR, `phase4_dashboard_${suffix}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\nScreenshot: ${screenshotPath}`);

    push(
      'No unexpected client errors or failed API calls',
      consoleErrors.length === 0 && httpErrors.length === 0,
      [...consoleErrors, ...httpErrors].slice(0, 3).join(' | ')
    );
  } catch (err: any) {
    push('Browser verification completed without a fatal error', false, err?.message);
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});

    // ── Cleanup (isolated fixtures only) ────────────────────────────────────
    try {
      if (studentId) {
        await prisma.shopPurchase.deleteMany({ where: { studentId } });
        await prisma.coinTransaction.deleteMany({ where: { studentId } });
        await prisma.streakRescueToken.deleteMany({ where: { studentId } });
        await prisma.leaderboardBoostToken.deleteMany({ where: { studentId } });
        await prisma.studentDailyStreak.deleteMany({ where: { studentId } });
        await prisma.studentReward.deleteMany({ where: { studentId } });
        await prisma.studentBadge.deleteMany({ where: { studentId } });
        await prisma.studentCoinBalance.deleteMany({ where: { studentId } });
        await prisma.profile.deleteMany({ where: { userId: studentId } });
        await prisma.user.delete({ where: { id: studentId } });
      }
      if (rewardDefId) await prisma.rewardDefinition.delete({ where: { id: rewardDefId } });
      console.log('Cleaned up isolated test fixtures.');
    } catch (cleanupErr: any) {
      console.error('Cleanup warning:', cleanupErr?.message);
    }
    await prisma.$disconnect();
  }

  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  console.log('\n=====================================================================');
  console.log(`  BROWSER VERIFICATION RESULT: ${passed}/${total} checks passed`);
  console.log('=====================================================================');
  if (passed !== total) {
    console.log('Failed checks:');
    checks.filter((c) => !c.passed).forEach((c) => console.log(`  FAIL: ${c.name}${c.details ? ` — ${c.details}` : ''}`));
  }
  process.exit(passed === total ? 0 : 1);
}

run();
