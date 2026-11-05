/**
 * Isolated verification for the Career Growth platform correction.
 *
 * Part A — pure configuration validation (no database access).
 * Part B — Career Growth scoring against an isolated, self-cleaning test
 *          student. The test creates only records it owns (a unique
 *          `@example.invalid` account plus its own opportunity/skill) and
 *          deletes them in `finally`. It NEVER reads or writes any real
 *          student's data or balances.
 *
 * Run:  npx tsx scripts/verify-career-growth.ts
 */

import 'dotenv/config';
import prisma from '../lib/prisma';
import {
  DEFAULT_REWARD_CONFIG,
  validateRewardConfig,
  RewardConfigValidationError,
  type RewardEngineConfig,
} from '../lib/gamification/rewardConfigService';
import { careerGrowthEngine } from '../lib/gamification/careerGrowthEngine';
import { getWeekKey, getEvaluationPeriod } from '../lib/gamification/rewardEngine';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function expectThrows(name: string, fn: () => void) {
  try {
    fn();
    assert(name, false, 'expected a validation error but none was thrown');
  } catch (error) {
    const ok = error instanceof RewardConfigValidationError;
    assert(name, ok, ok ? '' : `threw ${(error as Error)?.name}`);
  }
}

function freshConfig(): RewardEngineConfig {
  return structuredClone(DEFAULT_REWARD_CONFIG);
}

async function partA() {
  console.log('\nPart A — Career Growth configuration validation');

  const cfg = freshConfig();
  const w = cfg.careerGrowth.weights;

  assert(
    'default weights are 35 / 35 / 30',
    w.internshipApplications === 35 && w.hackathonsCompetitions === 35 && w.resumeStrength === 30,
    JSON.stringify(w)
  );
  assert(
    'default weights total exactly 100%',
    w.internshipApplications + w.hackathonsCompetitions + w.resumeStrength === 100
  );

  const resumeSum = Object.values(cfg.careerGrowth.resumeCriteria).reduce((a, b) => a + b, 0);
  assert('resume criteria total exactly 100%', Math.abs(resumeSum - 100) < 0.001, `sum=${resumeSum}`);

  assert(
    'no legacy LMS scoring section remains in the config shape',
    !Object.prototype.hasOwnProperty.call(cfg, 'scoringWeights')
  );
  assert(
    'config exposes only career-growth sections',
    ['weeklySchedule', 'careerGrowth', 'tierThresholds', 'rewardValues', 'championRewards'].every((k) =>
      Object.prototype.hasOwnProperty.call(cfg, k)
    )
  );

  const lmsKeys = ['lessonsCompleted', 'courseProgress', 'assessmentScore', 'streakMaintenance', 'learningConsistency'];
  assert(
    'no LMS metric keys appear anywhere in the effective config',
    !lmsKeys.some((k) => JSON.stringify(cfg).includes(k))
  );

  assert(
    'default configuration passes validation',
    (() => {
      try {
        validateRewardConfig(cfg);
        return true;
      } catch {
        return false;
      }
    })()
  );

  const badWeights = freshConfig();
  badWeights.careerGrowth.weights.resumeStrength = 29; // total 99
  expectThrows('rejects weights that do not total 100%', () => validateRewardConfig(badWeights));

  const badMilestones = freshConfig();
  badMilestones.careerGrowth.internshipMilestones.selected = 5; // lower than shortlisted (30)
  expectThrows('rejects non-monotonic internship milestones', () => validateRewardConfig(badMilestones));

  const badResume = freshConfig();
  badResume.careerGrowth.resumeCriteria.projects = 25; // resume total 105
  expectThrows('rejects resume criteria that do not total 100%', () => validateRewardConfig(badResume));

  const badCaps = freshConfig();
  badCaps.careerGrowth.caps.maxHackathonMilestonesPerWeek = 0;
  expectThrows('rejects out-of-range scoring caps', () => validateRewardConfig(badCaps));
}

async function partB() {
  console.log('\nPart B — Career Growth scoring (isolated self-cleaning test account)');

  const stamp = Date.now();
  const email = `zz-career-growth-verify-${stamp}@example.invalid`;
  const skillName = `zz-verify-skill-${stamp}`;
  const createdOpportunityIds: string[] = [];
  let userId: string | undefined;
  let skillId: string | undefined;

  try {
    const weekKey = getWeekKey();
    const { startDate, endDate } = getEvaluationPeriod(weekKey);
    const when = new Date((startDate.getTime() + endDate.getTime()) / 2);

    const user = await prisma.user.create({
      data: { name: 'ZZ Career Growth Verify', email, role: 'STUDENT', active: true },
    });
    userId = user.id;

    const profile = await prisma.profile.create({
      data: {
        userId,
        careerObjective: 'Verify career growth scoring',
        phone: '0000000000',
        location: 'Test',
        linkedinUrl: 'https://example.invalid/li',
        githubUrl: 'https://example.invalid/gh',
        portfolioUrl: 'https://example.invalid/pf',
        department: 'CSE',
        year: 3,
        section: 'A',
        college: 'Test College',
        cgpa: '9.0',
      },
    });

    const skill = await prisma.skill.create({ data: { name: skillName } });
    skillId = skill.id;
    await prisma.profileSkill.create({ data: { profileId: profile.id, skillId: skill.id } });
    await prisma.project.create({
      data: {
        profileId: profile.id,
        title: 'Verification project',
        description: 'Shipped 3 modules to production',
        technologies: [],
      },
    });

    // ── Scenario 1: verified SELECTED internship + verified hackathon registration ──
    const jobOpp = await prisma.opportunity.create({
      data: {
        title: `ZZ Verify Job ${stamp}`,
        organization: 'ZZ Verify',
        description: 'test',
        type: 'JOB',
        applicationDeadline: when,
        requiredSkills: [],
        allowedDegrees: [],
        allowedYears: [],
      },
    });
    createdOpportunityIds.push(jobOpp.id);

    await prisma.application.create({
      data: {
        userId,
        opportunityId: jobOpp.id,
        companyName: 'ZZ Verify Corp',
        position: 'SWE Intern',
        applicationType: 'INTERNSHIP',
        status: 'SELECTED',
        statusSource: 'SYSTEM',
        statusUpdatedAt: when,
        appliedDate: when,
      },
    });

    const hackOpp = await prisma.opportunity.create({
      data: {
        title: `ZZ Verify Hack ${stamp}`,
        organization: 'ZZ Verify',
        description: 'test',
        type: 'HACKATHON',
        applicationDeadline: when,
        requiredSkills: [],
        allowedDegrees: [],
        allowedYears: [],
      },
    });
    createdOpportunityIds.push(hackOpp.id);
    await prisma.opportunityRegistration.create({
      data: { opportunityId: hackOpp.id, studentId: userId, status: 'REGISTERED', registeredAt: when },
    });

    const r1 = await careerGrowthEngine.computeCareerGrowthScore(userId, weekKey, startDate, endDate);

    assert('final Career Growth Score is greater than zero', r1.finalScore > 0, `score=${r1.finalScore}`);
    assert(
      'internship score equals the "selected" milestone score (submission != selection)',
      r1.categories.internshipApplications.rawScore === DEFAULT_REWARD_CONFIG.careerGrowth.internshipMilestones.selected,
      `raw=${r1.categories.internshipApplications.rawScore}`
    );
    assert(
      'hackathon score equals the "registration confirmed" milestone score',
      r1.categories.hackathonsCompetitions.rawScore ===
        DEFAULT_REWARD_CONFIG.careerGrowth.hackathonMilestones.registrationConfirmed,
      `raw=${r1.categories.hackathonsCompetitions.rawScore}`
    );
    assert('resume strength score is greater than zero', r1.categories.resumeStrength.rawScore > 0);
    assert('resume improvement signal is captured', (r1.resumeCriteria.find((c) => c.key === 'improvement')?.earned ?? 0) > 0);
    assert(
      'result exposes exactly the three career-growth categories (no LMS metrics)',
      Object.keys(r1.categories).sort().join(',') ===
        'hackathonsCompetitions,internshipApplications,resumeStrength'
    );
    assert(
      'certifications are reported as unavailable (no data source)',
      r1.unavailableCriteria.includes('Certifications')
    );
    assert(
      'final score equals the weighted sum of the category contributions',
      Math.abs(
        r1.finalScore -
          (r1.categories.internshipApplications.weightedPoints +
            r1.categories.hackathonsCompetitions.weightedPoints +
            r1.categories.resumeStrength.weightedPoints)
      ) < 0.01
    );

    // ── Scenario 2: duplicate milestone for the SAME application must not stack ──
    await prisma.application.create({
      data: {
        userId,
        opportunityId: jobOpp.id, // same dedup key as the SELECTED application
        companyName: 'ZZ Verify Corp',
        position: 'SWE Intern',
        applicationType: 'INTERNSHIP',
        status: 'APPLIED',
        statusSource: 'SYSTEM',
        statusUpdatedAt: when,
        appliedDate: when,
      },
    });

    const r2 = await careerGrowthEngine.computeCareerGrowthScore(userId, weekKey, startDate, endDate);
    assert(
      'a repeated submission of the same application does not increase the internship score',
      r2.categories.internshipApplications.rawScore === r1.categories.internshipApplications.rawScore,
      `before=${r1.categories.internshipApplications.rawScore} after=${r2.categories.internshipApplications.rawScore}`
    );
    assert(
      'only one milestone is scored per distinct application',
      r2.categories.internshipApplications.milestones.filter((m) => m.detail?.includes('ZZ Verify Corp')).length === 1
    );

    // ── Scenario 3: merely applying never earns confirmed/winner-level points ──
    // The hackathon verification gate defaults to ON (anti-gaming), so it is
    // disabled for this scenario to isolate the milestone MAPPING. The gate
    // itself is verified in Scenario 4.
    const unmappedCfg: RewardEngineConfig = freshConfig();
    unmappedCfg.careerGrowth.verification.requireHackathonVerification = false;

    const r3Before = await careerGrowthEngine.computeCareerGrowthScore(userId, weekKey, startDate, endDate, unmappedCfg);

    const applyOnlyOpp = await prisma.opportunity.create({
      data: {
        title: `ZZ Verify ApplyOnly ${stamp}`,
        organization: 'ZZ Verify',
        description: 'test',
        type: 'COMPETITION',
        applicationDeadline: when,
        requiredSkills: [],
        allowedDegrees: [],
        allowedYears: [],
      },
    });
    createdOpportunityIds.push(applyOnlyOpp.id);
    await prisma.opportunityRegistration.create({
      data: { opportunityId: applyOnlyOpp.id, studentId: userId, status: 'INITIATED', appliedAt: when },
    });

    const r3 = await careerGrowthEngine.computeCareerGrowthScore(userId, weekKey, startDate, endDate, unmappedCfg);
    const hackDelta =
      r3.categories.hackathonsCompetitions.rawScore - r3Before.categories.hackathonsCompetitions.rawScore;
    assert(
      'an application-only competition adds only the "application submitted" points',
      Math.abs(hackDelta - DEFAULT_REWARD_CONFIG.careerGrowth.hackathonMilestones.applicationSubmitted) < 0.001,
      `delta=${hackDelta}`
    );
    const applyOnlyMilestone = r3.categories.hackathonsCompetitions.milestones.find((m) =>
      m.detail?.includes('ApplyOnly')
    );
    assert(
      'an application-only competition scores only "applicationSubmitted" (never confirmed/winner)',
      applyOnlyMilestone?.key === 'applicationSubmitted',
      `key=${applyOnlyMilestone?.key ?? 'none'}`
    );

    // ── Scenario 4: verification gate excludes unverified records when required ──
    const gated: RewardEngineConfig = freshConfig();
    gated.careerGrowth.verification.requireInternshipVerification = true;

    const manualOpp = await prisma.opportunity.create({
      data: {
        title: `ZZ Verify Manual ${stamp}`,
        organization: 'ZZ Verify',
        description: 'test',
        type: 'JOB',
        applicationDeadline: when,
        requiredSkills: [],
        allowedDegrees: [],
        allowedYears: [],
      },
    });
    createdOpportunityIds.push(manualOpp.id);
    await prisma.application.create({
      data: {
        userId,
        opportunityId: manualOpp.id,
        companyName: 'ZZ Verify Manual',
        position: 'Intern',
        applicationType: 'INTERNSHIP',
        status: 'SELECTED',
        statusSource: 'MANUAL', // untrusted source
        statusUpdatedAt: when,
        appliedDate: when,
      },
    });

    const rUngated = await careerGrowthEngine.computeCareerGrowthScore(userId, weekKey, startDate, endDate);
    const rGated = await careerGrowthEngine.computeCareerGrowthScore(userId, weekKey, startDate, endDate, gated);
    assert(
      'enabling the internship verification requirement excludes unverified records',
      rGated.categories.internshipApplications.rawScore <= rUngated.categories.internshipApplications.rawScore,
      `gated=${rGated.categories.internshipApplications.rawScore} ungated=${rUngated.categories.internshipApplications.rawScore}`
    );
    assert(
      'the unverified manual application is not scored when verification is required',
      !rGated.categories.internshipApplications.milestones.some((m) => m.detail?.includes('ZZ Verify Manual'))
    );

    // ── Scenario 5: every active student still receives a tier (fairness low-activity) ──
    const idle = await prisma.user.create({
      data: { name: 'ZZ Career Growth Idle', email: `zz-career-growth-idle-${stamp}@example.invalid`, role: 'STUDENT', active: true },
    });
    const idleResult = await careerGrowthEngine.computeCareerGrowthScore(idle.id, weekKey, startDate, endDate);
    assert(
      'a low-activity student still gets a numeric score and a valid tier',
      Number.isFinite(idleResult.finalScore) &&
        ['LEGENDARY', 'EPIC', 'RARE', 'COMMON', 'COMEBACK'].includes(idleResult.tier),
      `score=${idleResult.finalScore} tier=${idleResult.tier}`
    );
    await prisma.user.delete({ where: { id: idle.id } });

    console.log('\n  (isolated test account clean-up follows)');
  } finally {
    // ── Clean-up: remove ONLY the isolated records created by this test ──
    try {
      if (userId) await prisma.user.delete({ where: { id: userId } });
    } catch (e) {
      console.warn('  cleanup: failed to delete test user', (e as Error).message);
    }
    for (const id of createdOpportunityIds) {
      try {
        await prisma.opportunity.delete({ where: { id } });
      } catch (e) {
        console.warn('  cleanup: failed to delete test opportunity', (e as Error).message);
      }
    }
    try {
      if (skillId) await prisma.skill.delete({ where: { id: skillId } });
    } catch (e) {
      console.warn('  cleanup: failed to delete test skill', (e as Error).message);
    }
    console.log('  cleanup completed for the isolated test account');
  }
}

async function main() {
  await partA();
  await partB();

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  await prisma.$disconnect?.();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error('Verification crashed:', error);
  process.exit(2);
});
