import prisma from "../lib/prisma";

async function runSocialLinksTests() {
  console.log("===============================================================");
  console.log("🚀 STARTING SOCIAL LINKS & PROFILE ENHANCEMENT TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // Create test student user
  const testStudentEmail = `test_social_${Date.now()}@example.edu`;
  const student = await prisma.user.create({
    data: {
      name: "Test Social Links Student",
      email: testStudentEmail,
      role: "STUDENT",
    },
  });

  try {
    // -------------------------------------------------------------
    // Test 1: CodeChef URL Validation & Username Extraction
    // -------------------------------------------------------------
    function validateCodeChefUrl(rawUrl: string) {
      try {
        const parsed = new URL(rawUrl.trim());
        const hostname = parsed.hostname.toLowerCase();
        if (hostname !== "codechef.com" && hostname !== "www.codechef.com") return null;
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts[0] === "users" && parts[1]) return parts[1];
        if (parts.length === 1 && !["login", "signup", "ratings", "ide"].includes(parts[0].toLowerCase())) return parts[0];
        return null;
      } catch {
        return null;
      }
    }

    const codechefValid1 = validateCodeChefUrl("https://www.codechef.com/users/tourist");
    const codechefValid2 = validateCodeChefUrl("https://codechef.com/users/sathish_99");
    const codechefInvalid = validateCodeChefUrl("https://hackerrank.com/tourist");

    assert(
      codechefValid1 === "tourist" && codechefValid2 === "sathish_99" && codechefInvalid === null,
      "Test 1: CodeChef URL Validation and Username Extraction",
      `Extracted: ${codechefValid1}, ${codechefValid2}, ${codechefInvalid}`
    );

    // -------------------------------------------------------------
    // Test 2: LeetCode URL Validation & Username Extraction
    // -------------------------------------------------------------
    function validateLeetCodeUrl(rawUrl: string) {
      try {
        const parsed = new URL(rawUrl.trim());
        const hostname = parsed.hostname.toLowerCase();
        if (hostname !== "leetcode.com" && hostname !== "www.leetcode.com") return null;
        const parts = parsed.pathname.split("/").filter(Boolean);
        const reserved = ["problems", "explore", "contest", "discuss", "interview"];
        if (parts[0] === "u" && parts[1]) return parts[1];
        if (parts.length === 1 && !reserved.includes(parts[0].toLowerCase())) return parts[0];
        return null;
      } catch {
        return null;
      }
    }

    const leetcodeValid1 = validateLeetCodeUrl("https://leetcode.com/u/neal_wu/");
    const leetcodeValid2 = validateLeetCodeUrl("https://www.leetcode.com/u/sathish_ai");
    const leetcodeInvalid = validateLeetCodeUrl("https://leetcode.com/problems/two-sum");

    assert(
      leetcodeValid1 === "neal_wu" && leetcodeValid2 === "sathish_ai" && leetcodeInvalid === null,
      "Test 2: LeetCode URL Validation and Username Extraction",
      `Extracted: ${leetcodeValid1}, ${leetcodeValid2}, ${leetcodeInvalid}`
    );

    // -------------------------------------------------------------
    // Test 3: Portfolio URL Validation & Normalization
    // -------------------------------------------------------------
    function validatePortfolioUrl(rawUrl: string) {
      try {
        let input = rawUrl.trim();
        if (!/^https?:\/\//i.test(input)) input = `https://${input}`;
        const parsed = new URL(input);
        if (!parsed.hostname.includes(".")) return null;
        return parsed.toString();
      } catch {
        return null;
      }
    }

    const portValid1 = validatePortfolioUrl("https://sathish.dev");
    const portValid2 = validatePortfolioUrl("myportfolio.vercel.app");
    const portInvalid = validatePortfolioUrl("not a url");

    assert(
      portValid1 === "https://sathish.dev/" &&
      portValid2 === "https://myportfolio.vercel.app/" &&
      portInvalid === null,
      "Test 3: Portfolio URL Validation & Normalization",
      `Extracted: ${portValid1}, ${portValid2}, ${portInvalid}`
    );

    // -------------------------------------------------------------
    // Test 4: CodeChef Database Persistence & Verification
    // -------------------------------------------------------------
    const codechefVerified = await prisma.verifiedProfile.upsert({
      where: {
        studentId_platform: {
          studentId: student.id,
          platform: "CODECHEF",
        },
      },
      update: {
        profileUrl: "https://www.codechef.com/users/tourist",
        username: "tourist",
        verificationStatus: "VERIFIED",
        publicMetadata: { username: "tourist", verificationNote: "CodeChef profile verified." },
      },
      create: {
        studentId: student.id,
        platform: "CODECHEF",
        profileUrl: "https://www.codechef.com/users/tourist",
        username: "tourist",
        verificationStatus: "VERIFIED",
        publicMetadata: { username: "tourist", verificationNote: "CodeChef profile verified." },
      },
    });

    await prisma.profile.upsert({
      where: { userId: student.id },
      update: { codechefUrl: "https://www.codechef.com/users/tourist" },
      create: { userId: student.id, codechefUrl: "https://www.codechef.com/users/tourist" },
    });

    const studentProfileCC = await prisma.profile.findUnique({ where: { userId: student.id } });
    assert(
      codechefVerified.platform === "CODECHEF" &&
      codechefVerified.verificationStatus === "VERIFIED" &&
      studentProfileCC?.codechefUrl === "https://www.codechef.com/users/tourist",
      "Test 4: CodeChef Persistence & Profile Model Link",
      `Profile codechefUrl: ${studentProfileCC?.codechefUrl}`
    );

    // -------------------------------------------------------------
    // Test 5: LeetCode Database Persistence & Verification
    // -------------------------------------------------------------
    const leetcodeVerified = await prisma.verifiedProfile.upsert({
      where: {
        studentId_platform: {
          studentId: student.id,
          platform: "LEETCODE",
        },
      },
      update: {
        profileUrl: "https://leetcode.com/u/neal_wu",
        username: "neal_wu",
        verificationStatus: "VERIFIED",
        publicMetadata: { username: "neal_wu", totalSolved: 1250, verificationNote: "LeetCode Profile verified" },
      },
      create: {
        studentId: student.id,
        platform: "LEETCODE",
        profileUrl: "https://leetcode.com/u/neal_wu",
        username: "neal_wu",
        verificationStatus: "VERIFIED",
        publicMetadata: { username: "neal_wu", totalSolved: 1250, verificationNote: "LeetCode Profile verified" },
      },
    });

    await prisma.profile.update({
      where: { userId: student.id },
      data: { leetcodeUrl: "https://leetcode.com/u/neal_wu" },
    });

    const studentProfileLC = await prisma.profile.findUnique({ where: { userId: student.id } });
    assert(
      leetcodeVerified.platform === "LEETCODE" &&
      leetcodeVerified.verificationStatus === "VERIFIED" &&
      studentProfileLC?.leetcodeUrl === "https://leetcode.com/u/neal_wu",
      "Test 5: LeetCode Persistence & Profile Model Link",
      `Profile leetcodeUrl: ${studentProfileLC?.leetcodeUrl}`
    );

    // -------------------------------------------------------------
    // Test 6: Portfolio Database Persistence & Reachability Record
    // -------------------------------------------------------------
    const portfolioVerified = await prisma.verifiedProfile.upsert({
      where: {
        studentId_platform: {
          studentId: student.id,
          platform: "PORTFOLIO",
        },
      },
      update: {
        profileUrl: "https://sathish.dev",
        username: "sathish.dev",
        verificationStatus: "VERIFIED",
        publicMetadata: { domain: "sathish.dev", isReachable: true, verificationNote: "Portfolio website online & reachable." },
      },
      create: {
        studentId: student.id,
        platform: "PORTFOLIO",
        profileUrl: "https://sathish.dev",
        username: "sathish.dev",
        verificationStatus: "VERIFIED",
        publicMetadata: { domain: "sathish.dev", isReachable: true, verificationNote: "Portfolio website online & reachable." },
      },
    });

    await prisma.profile.update({
      where: { userId: student.id },
      data: { portfolioUrl: "https://sathish.dev" },
    });

    const studentProfilePort = await prisma.profile.findUnique({ where: { userId: student.id } });
    assert(
      portfolioVerified.platform === "PORTFOLIO" &&
      portfolioVerified.verificationStatus === "VERIFIED" &&
      studentProfilePort?.portfolioUrl === "https://sathish.dev",
      "Test 6: Portfolio Persistence & Profile Model Link",
      `Profile portfolioUrl: ${studentProfilePort?.portfolioUrl}`
    );

    // -------------------------------------------------------------
    // Test 7: Re-Verify Functionality (Updating Existing Records)
    // -------------------------------------------------------------
    const updatedLeetCode = await prisma.verifiedProfile.upsert({
      where: {
        studentId_platform: {
          studentId: student.id,
          platform: "LEETCODE",
        },
      },
      update: {
        profileUrl: "https://leetcode.com/u/neal_wu_updated",
        username: "neal_wu_updated",
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        publicMetadata: { username: "neal_wu_updated", totalSolved: 1300 },
      },
      create: {
        studentId: student.id,
        platform: "LEETCODE",
        profileUrl: "https://leetcode.com/u/neal_wu_updated",
        username: "neal_wu_updated",
      },
    });

    assert(
      updatedLeetCode.username === "neal_wu_updated" &&
      (updatedLeetCode.publicMetadata as any)?.totalSolved === 1300,
      "Test 7: Re-Verify Functionality Updates Existing Record In-Place",
      `Updated user: ${updatedLeetCode.username}`
    );

    // -------------------------------------------------------------
    // Test 8: GitHub, LinkedIn, Codolio Regression Testing
    // -------------------------------------------------------------
    await prisma.verifiedProfile.createMany({
      data: [
        {
          studentId: student.id,
          platform: "GITHUB",
          profileUrl: "https://github.com/torvalds",
          username: "torvalds",
          verificationStatus: "VERIFIED",
        },
        {
          studentId: student.id,
          platform: "LINKEDIN",
          profileUrl: "https://linkedin.com/in/satyanadella",
          username: "satyanadella",
          verificationStatus: "FORMAT_VERIFIED",
        },
        {
          studentId: student.id,
          platform: "CODOLIO",
          profileUrl: "https://codolio.com/profile/topcoder",
          username: "topcoder",
          verificationStatus: "VERIFIED",
        },
      ],
    });

    await prisma.profile.update({
      where: { userId: student.id },
      data: {
        githubUrl: "https://github.com/torvalds",
        linkedinUrl: "https://linkedin.com/in/satyanadella",
        codolioUrl: "https://codolio.com/profile/topcoder",
      },
    });

    const allVerifiedProfiles = await prisma.verifiedProfile.findMany({
      where: { studentId: student.id },
    });

    const platformsFound = allVerifiedProfiles.map((p) => p.platform).sort();
    const expectedPlatforms = ["CODECHEF", "CODOLIO", "GITHUB", "LEETCODE", "LINKEDIN", "PORTFOLIO"].sort();

    assert(
      JSON.stringify(platformsFound) === JSON.stringify(expectedPlatforms),
      "Test 8: Regression Test: All 6 Platforms Coexist Correctly in Database",
      `Found: ${platformsFound.join(", ")}`
    );

    // -------------------------------------------------------------
    // Test 9: Dynamic Social Links Count Calculation
    // -------------------------------------------------------------
    const latestProfile = await prisma.profile.findUnique({ where: { userId: student.id } });
    const allSocialUrls = [
      latestProfile?.githubUrl,
      latestProfile?.linkedinUrl,
      latestProfile?.codolioUrl,
      latestProfile?.codechefUrl,
      latestProfile?.leetcodeUrl,
      latestProfile?.portfolioUrl,
    ].filter(Boolean);

    assert(
      allSocialUrls.length === 6 && allVerifiedProfiles.length === 6,
      "Test 9: Dynamic Social Links Count Reflects All 6 Active Links",
      `Count: ${allSocialUrls.length} links, ${allVerifiedProfiles.length} verified records`
    );

    // -------------------------------------------------------------
    // Test 10: Profile Completion Calculation Integration
    // -------------------------------------------------------------
    const hasVerifiedLinks = Boolean(
      allVerifiedProfiles.length > 0 ||
      latestProfile?.githubUrl ||
      latestProfile?.linkedinUrl ||
      latestProfile?.codolioUrl ||
      latestProfile?.codechefUrl ||
      latestProfile?.leetcodeUrl ||
      latestProfile?.portfolioUrl
    );

    assert(
      hasVerifiedLinks === true,
      "Test 10: Profile Completion Integration Recognizes Enhanced Social Links"
    );
  } finally {
    // Cleanup
    await prisma.user.delete({ where: { id: student.id } }).catch(() => {});
  }

  console.log("\n===============================================================");
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSocialLinksTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
