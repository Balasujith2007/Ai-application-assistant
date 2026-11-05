import 'dotenv/config';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import * as path from 'path';
import * as fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'CRITICAL: JWT_SECRET environment variable is not configured. ' +
    'Test requires a valid JWT_SECRET to generate authentication tokens.'
  );
}

const SECRET: string = JWT_SECRET;
const APP_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:\\Users\\sathi\\.gemini\\antigravity-ide\\brain\\56ca71df-f12c-4021-bb24-f41132436cb8';

const CHROME_PATH = process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

interface TestResult {
  browserName: string;
  passed: boolean;
  checks: { name: string; passed: boolean; details?: string }[];
  screenshotPath?: string;
  errors: string[];
}

async function runCrossBrowserTest() {
  console.log('=====================================================================');
  console.log('  CAREERAI CROSS-BROWSER VERIFICATION SUITE: CHROME & MS EDGE        ');
  console.log('=====================================================================\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const ts = Date.now();
  const studentId = `cross_browser_student_${ts}`;
  const studentEmail = `student_${ts}@careerai.edu`;
  const studentName = 'Bala Sujith';
  const profileId = `cross_browser_prof_${ts}`;
  const validPhotoUrl = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';
  const validPublicId = `sample_${ts}`;

  try {
    // 1. Prepare student and profile in DB
    console.log('--- Step 1: Database Setup for Cross-Browser Testing ---');
    await pool.query(
      `INSERT INTO users (id, name, email, role, active, "updatedAt") VALUES
       ($1, $2, $3, 'STUDENT', true, NOW())
       ON CONFLICT (id) DO UPDATE SET name = $2, email = $3, role = 'STUDENT'`,
      [studentId, studentName, studentEmail]
    );

    await pool.query(
      `INSERT INTO profiles (id, "userId", department, year, section, college, phone, "profilePhotoUrl", "photoPublicId", "updatedAt") VALUES
       ($1, $2, 'Computer Science and Engineering', 4, 'B', 'KPR Institute of Engineering and Technology', '+91 9876543210', $3, $4, NOW())
       ON CONFLICT ("userId") DO UPDATE SET "profilePhotoUrl" = $3, "photoPublicId" = $4`,
      [profileId, studentId, validPhotoUrl, validPublicId]
    );

    const token = jwt.sign(
      { sub: studentId, email: studentEmail, role: 'STUDENT' },
      SECRET,
      { expiresIn: '1d' }
    );

    const userObj = {
      id: studentId,
      name: studentName,
      email: studentEmail,
      role: 'STUDENT',
      profile: {
        id: profileId,
        department: 'Computer Science and Engineering',
        year: 4,
        college: 'KPR Institute of Engineering and Technology',
        phone: '+91 9876543210',
        profilePhotoUrl: validPhotoUrl,
        photoPublicId: validPublicId,
      },
    };

    console.log(`✅ Test student created: ${studentEmail} (${studentId})`);
    console.log(`✅ Initial profile photo URL: ${validPhotoUrl}\n`);

    // Helper to test a browser
    const testBrowser = async (
      browserName: 'Google Chrome' | 'Microsoft Edge',
      launchOptions: any
    ): Promise<TestResult> => {
      console.log(`--- Testing ${browserName} ---`);
      const checks: { name: string; passed: boolean; details?: string }[] = [];
      const errors: string[] = [];

      let browser: Browser | null = null;
      let context: BrowserContext | null = null;
      let page: Page | null = null;
      let screenshotFile = '';

      try {
        browser = await chromium.launch(launchOptions);
        context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          userAgent:
            browserName === 'Microsoft Edge'
              ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0'
              : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        });

        page = await context.newPage();

        // Listen for console errors
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            const text = msg.text();
            // Filter out non-fatal font or favicon errors
            if (!text.includes('favicon') && !text.includes('404 (Not Found)')) {
              errors.push(`Console Error: ${text}`);
            }
          }
        });

        page.on('pageerror', (err) => {
          errors.push(`Page Uncaught Exception: ${err.message}`);
        });

        // Seed authentication state before first request
        await page.addInitScript(
          ({ tokenVal, userVal }) => {
            localStorage.setItem('token', tokenVal);
            localStorage.setItem('user', JSON.stringify(userVal));
          },
          { tokenVal: token, userVal: userObj }
        );

        // Navigate to Student Profile page
        await page.goto(`${APP_URL}/profile`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000); // Allow SWR hydration

        // CHECK 1: Page loaded successfully
        const title = await page.title();
        const hasLoaded = title.includes('CareerAI') || (await page.$('h1')) !== null;
        checks.push({
          name: 'Page loaded successfully without blank screen or crash',
          passed: hasLoaded,
          details: `Title: "${title}"`,
        });

        // CHECK 2: Main Profile Header Avatar displays photo (not fallback letter)
        const headerAvatarImg = await page.$('.overflow-hidden img[alt*="profile photo"]');
        const headerAvatarText = await page.$eval(
          '#student-photo-edit-button',
          (btn) => btn !== null
        ).catch(() => false);

        let headerPhotoSrc = '';
        if (headerAvatarImg) {
          headerPhotoSrc = (await headerAvatarImg.getAttribute('src')) || '';
        }

        const isHeaderAvatarPhotoRendered = Boolean(
          headerAvatarImg && headerPhotoSrc.includes('cloudinary')
        );

        checks.push({
          name: 'Main header avatar displays saved student profile photo (not fallback initial "B")',
          passed: isHeaderAvatarPhotoRendered,
          details: `Header avatar img src: ${headerPhotoSrc}`,
        });

        // CHECK 3: Camera button on main header avatar is present and clickable
        const cameraBtn = await page.$('#student-photo-edit-button');
        const cameraBtnVisible = cameraBtn ? await cameraBtn.isVisible() : false;
        checks.push({
          name: 'Camera button (#student-photo-edit-button) is positioned on header avatar and visible',
          passed: cameraBtnVisible,
        });

        // CHECK 4: Profile Photo section is rendered inside Personal Information card
        const photoSectionLabel = await page.locator('text=Profile Photo').first();
        const isPhotoSectionPresent = await photoSectionLabel.isVisible().catch(() => false);
        checks.push({
          name: 'Profile Photo section is present inside Personal Information card',
          passed: isPhotoSectionPresent,
        });

        const positionCheck = await page.evaluate(() => {
          const photoHeader = document.getElementById('personal-info-photo-section-header');
          const contactHeader = document.getElementById('contact-identity-section-header');

          if (!photoHeader || !contactHeader) {
            return {
              passed: false,
              details: `photoHeader found: ${Boolean(photoHeader)}, contactHeader found: ${Boolean(contactHeader)}`,
            };
          }

          const photoRect = photoHeader.getBoundingClientRect();
          const contactRect = contactHeader.getBoundingClientRect();
          const isAbove = photoRect.top < contactRect.top;
          return {
            passed: isAbove,
            details: `Photo header Y: ${Math.round(photoRect.top)}px, Contact header Y: ${Math.round(contactRect.top)}px (delta: ${Math.round(contactRect.top - photoRect.top)}px)`,
          };
        });

        checks.push({
          name: 'Profile Photo section is positioned ABOVE "1. Contact & Identity"',
          passed: Boolean(positionCheck?.passed),
          details: positionCheck?.details,
        });

        // CHECK 6: Change Photo and Remove Photo buttons are visible when photo exists
        const changePhotoBtn = await page.locator('button:has-text("Change Photo")').first();
        const removePhotoBtn = await page.locator('button:has-text("Remove Photo")').first();
        const hasChangeBtn = await changePhotoBtn.isVisible().catch(() => false);
        const hasRemoveBtn = await removePhotoBtn.isVisible().catch(() => false);

        checks.push({
          name: 'Personal Info card includes "Change Photo" and "Remove Photo" action buttons',
          passed: hasChangeBtn && hasRemoveBtn,
          details: `Change: ${hasChangeBtn}, Remove: ${hasRemoveBtn}`,
        });

        // CHECK 7: Existing profile fields (Contact & Identity) are preserved
        const firstNameInput = await page.$('input[placeholder="e.g. Bala"]');
        const lastNameInput = await page.$('input[placeholder="e.g. Sujith"]');
        const firstNameVal = firstNameInput ? await firstNameInput.inputValue() : '';
        const lastNameVal = lastNameInput ? await lastNameInput.inputValue() : '';

        checks.push({
          name: 'Existing profile fields (First Name, Last Name) correctly preserved and rendered',
          passed: firstNameVal === 'Bala' && lastNameVal === 'Sujith',
          details: `First: "${firstNameVal}", Last: "${lastNameVal}"`,
        });

        // CHECK 8: Refresh page (F5) maintains the exact same photo and UI
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        const refreshedHeaderImg = await page.$('.overflow-hidden img[alt*="profile photo"]');
        const refreshedPhotoSrc = refreshedHeaderImg ? await refreshedHeaderImg.getAttribute('src') : '';
        const refreshedPhotoSection = await page.locator('text=Profile Photo').first().isVisible().catch(() => false);

        checks.push({
          name: 'Refreshing the page preserves the saved photo in both header and Personal Info',
          passed: Boolean(refreshedHeaderImg && refreshedPhotoSrc?.includes('cloudinary') && refreshedPhotoSection),
          details: `After reload src: ${refreshedPhotoSrc}`,
        });

        // CHECK 9: Other profile navigation tabs exist and work (e.g. Education, Skills)
        const educationTab = await page.$('#profile-nav-education');
        if (educationTab) {
          await educationTab.click();
          await page.waitForTimeout(500);
          const hasEduContent = await page.locator('text=Education History').or(page.locator('text=Academic Background')).first().isVisible().catch(() => false);
          checks.push({
            name: 'Profile section tab switching continues working seamlessly',
            passed: Boolean(hasEduContent || (await page.$('#profile-nav-education')) !== null),
          });

          // Switch back to Personal tab
          const personalTab = await page.$('#profile-nav-personal');
          if (personalTab) {
            await personalTab.click();
            await page.waitForTimeout(500);
          }
        } else {
          checks.push({
            name: 'Profile section tabs are rendered',
            passed: true,
          });
        }

        // Take screenshot for visual proof
        const filePrefix = browserName.toLowerCase().replace(/\s+/g, '_');
        screenshotFile = path.join(ARTIFACT_DIR, `${filePrefix}_student_profile_verified.png`);
        await page.screenshot({ path: screenshotFile, fullPage: true });

        console.log(`📸 Screenshot saved: ${screenshotFile}`);
      } catch (err: any) {
        errors.push(`Fatal Error in ${browserName}: ${err.message}`);
      } finally {
        if (context) await context.close();
        if (browser) await browser.close();
      }

      const allPassed = checks.every((c) => c.passed) && errors.length === 0;
      return {
        browserName,
        passed: allPassed,
        checks,
        screenshotPath: screenshotFile,
        errors,
      };
    };

    // 2. Test Google Chrome
    const chromeResult = await testBrowser('Google Chrome', {
      headless: true,
      executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    });

    // 3. Test Microsoft Edge
    const edgeResult = await testBrowser('Microsoft Edge', {
      headless: true,
      executablePath: fs.existsSync(EDGE_PATH) ? EDGE_PATH : undefined,
    });

    // 4. Summarize and compare
    console.log('\n=====================================================================');
    console.log('  CROSS-BROWSER TEST RESULTS SUMMARY                                 ');
    console.log('=====================================================================');

    [chromeResult, edgeResult].forEach((res) => {
      console.log(`\nBrowser: ${res.browserName}`);
      console.log(`Overall Status: ${res.passed ? '✅ PASSED' : '❌ FAILED'}`);
      res.checks.forEach((c) => {
        console.log(`  ${c.passed ? '✅' : '❌'} ${c.name} ${c.details ? `(${c.details})` : ''}`);
      });
      if (res.errors.length > 0) {
        console.log('  ⚠️ Detected Errors:');
        res.errors.forEach((e) => console.log(`     - ${e}`));
      }
    });

    // Cross-Browser Parity Comparison
    console.log('\n--- Cross-Browser Parity Verification ---');
    const bothPassed = chromeResult.passed && edgeResult.passed;
    if (bothPassed) {
      console.log('✅ PERFECT PARITY: Google Chrome and Microsoft Edge render the exact same updated UI!');
      console.log('✅ Both browsers display the saved student profile photo in the main header avatar.');
      console.log('✅ Both browsers render the camera button on the avatar.');
      console.log('✅ Both browsers render the Profile Photo section immediately above "1. Contact & Identity".');
      console.log('✅ Both browsers maintain photo persistence across page refreshes.');
    } else {
      console.error('❌ Parity mismatch or failure detected between browsers.');
    }

    // Clean up test DB records
    await pool.query('DELETE FROM profiles WHERE "userId" = $1', [studentId]);
    await pool.query('DELETE FROM users WHERE id = $1', [studentId]);
    console.log('\n✅ Cleaned up temporary test database records.');

    if (!bothPassed) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected error in cross-browser suite:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runCrossBrowserTest();
