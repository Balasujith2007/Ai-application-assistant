import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { REWARD_CONFIG, RewardTier } from './rewardConfig';
import { getFormattedDateInTz } from './checkInService';
import { getRewardConfig, type RewardValuesConfig } from './rewardConfigService';
import { careerGrowthEngine, type CareerGrowthResult } from './careerGrowthEngine';
import { applyCoinMutationInTx } from './coinLedger';

// These enums exist in schema.prisma but the Prisma client has not been regenerated yet.
// Using string literal types that exactly match the DB enum values prevents import errors
// while maintaining full type safety. Run `npx prisma generate` after the next migration
// to restore the @prisma/client imports.
type RewardType =
  | 'BONUS_XP'
  | 'BONUS_COINS'
  | 'STREAK_RESCUE_TOKEN'
  | 'LEADERBOARD_BOOST_TOKEN'
  | 'EXCLUSIVE_BADGE'
  | 'PROFILE_FRAME'
  | 'ACHIEVEMENT_REWARD';

type RewardRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'COMEBACK';

type RewardTriggerType =
  | 'WEEKLY_SATURDAY'
  | 'CHAMPION_FIRST_PLACE'
  | 'CHAMPION_SECOND_PLACE'
  | 'CHAMPION_THIRD_PLACE'
  | 'ACHIEVEMENT_LESSONS'
  | 'ACHIEVEMENT_COURSE_COMPLETION'
  | 'ACHIEVEMENT_ASSESSMENT_IMPROVEMENT'
  | 'ACHIEVEMENT_CONSISTENCY'
  | 'ACHIEVEMENT_RETURNING_INACTIVE'
  | 'ACHIEVEMENT_STREAK_MILESTONE'
  | 'ACHIEVEMENT_PROJECT_COMPLETION'
  | 'ACHIEVEMENT_LEARNING_MILESTONE';

type RewardStatus = 'ALLOCATED' | 'CLAIMED' | 'EXPIRED';

/**
 * Mystery Gift & Weekly Reward Engine
 * Handles weekly career-growth scoring, reward allocation, and eligibility logic.
 *
 * Weekly performance is derived exclusively from the Career Growth Engine
 * (internship/job applications, hackathons & competitions, resume strength).
 * This platform is NOT an LMS, so lessons completed, course progress, learning
 * consistency, assessment scores and learning streaks are never used.
 */

/**
 * Calculates the week key for a given date (e.g., "2026-W44")
 */
export function getWeekKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / 86400000);
  const weekNumber = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
  return `${year}-W${weekNumber}`;
}

/**
 * Gets the evaluation period start and end dates for a given week
 * Monday 00:00 to Friday 23:59:59 in configured timezone
 */
export function getEvaluationPeriod(weekKey: string): { startDate: Date; endDate: Date } {
  const [year, week] = weekKey.split('-W').map(Number);
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7;
  const monday = new Date(firstDayOfYear.getTime() + daysOffset * 86400000);

  // Adjust to Monday
  const dayOfWeek = monday.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(monday.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  // Friday 23:59:59
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  return { startDate: monday, endDate: friday };
}

/**
 * Allocates a reward based on tier and RNG.
 * Reward value ranges and probabilities are read from the persisted reward
 * configuration (`config.rewardValues[tier]`). The existing rule set is
 * preserved: only the numeric sources move from hardcoded to DB-backed values.
 */
function allocateRewardByTier(
  tier: RewardTier,
  rewardValues: RewardValuesConfig
): {
  rewardType: RewardType;
  rewardRarity: RewardRarity;
  xpAmount: number;
  coinAmount: number;
  badgeId?: string;
  badgeName?: string;
  badgeIcon?: string;
  profileFrameUrl?: string;
} {
  const config = rewardValues[tier];
  const rng = Math.random();

  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (Math.max(min, max) - Math.min(min, max) + 1) + Math.min(min, max));

  const xpAmount = randInt(config.xpMin, config.xpMax);
  const coinAmount = randInt(config.coinsMin, config.coinsMax);

  let rewardType: RewardType = 'BONUS_XP';
  let rewardRarity: RewardRarity = 'COMMON';

  // Declare optional reward detail variables upfront
  let badgeId: string | undefined;
  let badgeName: string | undefined;
  let badgeIcon: string | undefined;
  let profileFrameUrl: string | undefined;

  if (tier === 'LEGENDARY') {
    rewardRarity = 'LEGENDARY';
    const boostProb = config.leaderboardBoostProbability ?? 0;
    const frameProb = config.profileFrameProbability ?? 0;
    const badgeProb = config.exclusiveBadgeProbability ?? 0;
    if (rng < boostProb) {
      rewardType = 'LEADERBOARD_BOOST_TOKEN';
    } else if (rng < boostProb + frameProb) {
      rewardType = 'PROFILE_FRAME';
      profileFrameUrl = '/frames/legendary-gold.png';
    } else if (rng < badgeProb) {
      rewardType = 'EXCLUSIVE_BADGE';
      badgeId = 'LEGENDARY_PERFORMER';
      badgeName = 'Legendary Performer';
      badgeIcon = '👑';
    }
  } else if (tier === 'EPIC') {
    rewardRarity = 'EPIC';
    const rescueProb = config.streakRescueProbability ?? 0;
    const badgeProb = config.badgeProbability ?? 0;
    if (rng < rescueProb) {
      rewardType = 'STREAK_RESCUE_TOKEN';
    } else if (rng < badgeProb) {
      rewardType = 'EXCLUSIVE_BADGE';
      badgeId = 'EPIC_ACHIEVER';
      badgeName = 'Epic Achiever';
      badgeIcon = '💎';
    }
  } else if (tier === 'RARE') {
    rewardRarity = 'RARE';
    const badgeProb = config.badgeProbability ?? 0;
    if (rng < badgeProb) {
      rewardType = 'EXCLUSIVE_BADGE';
      badgeId = 'RARE_FIND';
      badgeName = 'Rare Find';
      badgeIcon = '⭐';
    }
  } else if (tier === 'COMMON') {
    rewardRarity = 'COMMON';
    if (coinAmount > 0) {
      rewardType = 'BONUS_COINS';
    }
  } else {
    // COMEBACK
    rewardRarity = 'COMEBACK';
    rewardType = 'BONUS_XP';
  }

  return { rewardType, rewardRarity, xpAmount, coinAmount, badgeId, badgeName, badgeIcon, profileFrameUrl };
}

/**
 * Main reward engine class
 */
export class RewardEngine {
  /**
   * Evaluates student performance for a given week and allocates reward
   */
  async evaluateAndAllocateWeeklyReward(
    studentId: string,
    weekKey: string
  ): Promise<{
    success: boolean;
    alreadyAllocated: boolean;
    rewardId?: string;
    tier?: RewardTier;
    score?: number;
  }> {
    // Check if already allocated
    const existing = await prisma.studentReward.findUnique({
      where: {
        StudentReward_studentId_weekKey_trigger_unique: {
          studentId,
          evaluationWeekKey: weekKey,
          triggerType: 'WEEKLY_SATURDAY',
        },
      },
    });

    if (existing) {
      return { success: true, alreadyAllocated: true, rewardId: existing.id };
    }

    // Load the effective (persisted) reward configuration
    const config = await getRewardConfig();

    // Get evaluation period
    const { startDate, endDate } = getEvaluationPeriod(weekKey);

    // Compute the weekly Career Growth Score from real platform records only
    // (internship/job applications, hackathons & competitions, resume strength).
    const result = await careerGrowthEngine.computeCareerGrowthScore(
      studentId,
      weekKey,
      startDate,
      endDate,
      config
    );
    const { finalScore, tier } = result;

    // Allocate reward
    const reward = allocateRewardByTier(tier, config.rewardValues);

    // Compact, JSON-safe career growth breakdown (no Date values), persisted both
    // as the immutable weekly snapshot and on the reward for an audit trail.
    const careerSnapshot = careerGrowthEngine.toSnapshot(result);

    // Persist the immutable weekly career-growth snapshot. `update: {}` keeps an
    // existing snapshot untouched, so re-runs never overwrite a finalized week.
    await prisma.weeklyPerformanceSnapshot.upsert({
      where: {
        WeeklyPerformanceSnapshot_studentId_weekKey_unique: { studentId, weekKey },
      },
      update: {},
      create: {
        studentId,
        weekKey,
        startDate,
        endDate,
        weightedScore: finalScore,
        rankTier: tier,
        careerBreakdown: careerSnapshot as unknown as Prisma.InputJsonValue,
      },
    });

    // Create student reward
    const studentReward = await prisma.studentReward.create({
      data: {
        studentId,
        rewardType: reward.rewardType,
        rewardRarity: reward.rewardRarity,
        triggerType: 'WEEKLY_SATURDAY',
        status: 'ALLOCATED',
        xpAmount: reward.xpAmount,
        coinAmount: reward.coinAmount,
        badgeId: reward.badgeId,
        badgeName: reward.badgeName,
        badgeIcon: reward.badgeIcon,
        profileFrameUrl: reward.profileFrameUrl,
        weeklyScore: finalScore,
        weeklyRank: tier,
        performanceMetrics: careerSnapshot as unknown as Prisma.InputJsonValue,
        evaluationWeekKey: weekKey,
        personalizedMessage: this.generatePersonalizedMessage(tier, result),
        reasonEarned: this.generateReasonEarned(result),
        idempotencyKey: `${studentId}_${weekKey}_WEEKLY`,
        expiresAt: new Date(Date.now() + REWARD_CONFIG.REWARD_EXPIRY_DAYS * 86400000),
      },
    });

    // Award special tokens if applicable
    if (reward.rewardType === 'STREAK_RESCUE_TOKEN') {
      await this.awardStreakRescueToken(studentId, studentReward.id);
    } else if (reward.rewardType === 'LEADERBOARD_BOOST_TOKEN') {
      await this.awardLeaderboardBoostToken(studentId, studentReward.id);
    }

    return {
      success: true,
      alreadyAllocated: false,
      rewardId: studentReward.id,
      tier,
      score: finalScore,
    };
  }

  /**
   * Claims a reward and applies it to the student's account.
   *
   * The whole flow runs inside a single database transaction:
   *  - an atomic compare-and-set flips the reward ALLOCATED -> CLAIMED, which
   *    makes concurrent/duplicate claim requests safe (only one wins);
   *  - XP is credited through the points ledger;
   *  - coins are credited through the coin ledger using the backend-allocated
   *    `reward.coinAmount` (never a client-supplied amount) with a stable
   *    idempotency key;
   *  - badges are awarded;
   *  - an immutable RewardClaim record captures the before/after balances.
   */
  async claimReward(
    studentId: string,
    rewardId: string
  ): Promise<{
    success: boolean;
    alreadyClaimed: boolean;
    xpAwarded?: number;
    coinsAwarded?: number;
    coinBalance?: number;
    message?: string;
  }> {
    try {
      return await prisma.$transaction(async (tx) => {
        const reward = await tx.studentReward.findUnique({ where: { id: rewardId } });

        if (!reward) {
          return { success: false, alreadyClaimed: false, message: 'Reward not found' };
        }

        if (reward.studentId !== studentId) {
          return { success: false, alreadyClaimed: false, message: 'Reward does not belong to student' };
        }

        if (reward.status === 'CLAIMED') {
          return { success: true, alreadyClaimed: true, message: 'Reward already claimed' };
        }

        if (reward.status === 'EXPIRED' || (reward.expiresAt && reward.expiresAt.getTime() < Date.now())) {
          return { success: false, alreadyClaimed: false, message: 'Reward has expired' };
        }

        // Atomic guard: the first request to flip ALLOCATED -> CLAIMED wins.
        // Concurrent requests observe count === 0 and are treated as duplicates.
        const guard = await tx.studentReward.updateMany({
          where: { id: rewardId, studentId, status: 'ALLOCATED' },
          data: { status: 'CLAIMED', claimedAt: new Date() },
        });

        if (guard.count === 0) {
          return { success: true, alreadyClaimed: true, message: 'Reward already claimed' };
        }

        // Current balances
        const currentXpResult = await tx.pointsLedger.aggregate({
          where: { studentId },
          _sum: { pointsAwarded: true },
        });
        const currentXp = currentXpResult._sum.pointsAwarded || 0;

        const coinBalanceRow = await tx.studentCoinBalance.findUnique({ where: { studentId } });
        const currentCoins = coinBalanceRow?.balance ?? 0;

        let xpAwarded = 0;
        let coinsAwarded = 0;
        let finalCoinBalance = currentCoins;

        // ── XP credit (auditable system activity + ledger entry) ──
        if (reward.xpAmount && reward.xpAmount > 0) {
          const rewardActivity = await tx.verifiedActivity.create({
            data: {
              studentId,
              sourceType: 'CONSISTENCY',
              sourcePlatform: 'CAREERAI',
              activityType: 'MYSTERY_REWARD',
              externalActivityId: `reward_claim_${rewardId}`,
              verificationStatus: 'VERIFIED',
              verificationMethod: 'SYSTEM_REWARD',
              occurredAt: new Date(),
              rawMetadata: { rewardId, rewardType: reward.rewardType, xpAmount: reward.xpAmount },
            },
          });
          await tx.pointsLedger.create({
            data: {
              studentId,
              verifiedActivityId: rewardActivity.id,
              category: 'CONSISTENCY',
              pointsAwarded: reward.xpAmount,
              reason: `Mystery Gift Reward: ${reward.personalizedMessage ?? 'Weekly reward'}`,
              periodKey: getWeekKey(),
            },
          });
          xpAwarded = reward.xpAmount;
        }

        // ── Coins credit (exact backend-allocated amount, idempotent) ──
        if (reward.coinAmount && reward.coinAmount > 0) {
          const coinResult = await applyCoinMutationInTx(tx, {
            studentId,
            amount: reward.coinAmount,
            transactionType: 'REWARD_CREDIT',
            reason: `Mystery Gift Reward: ${reward.personalizedMessage ?? 'Weekly reward'}`,
            referenceId: rewardId,
            idempotencyKey: `reward_claim_coins_${rewardId}`,
          });
          coinsAwarded = coinResult.alreadyApplied ? 0 : coinResult.amount;
          finalCoinBalance = coinResult.newBalance;
        }

        // ── Badge award ──
        if (reward.rewardType === 'EXCLUSIVE_BADGE' && reward.badgeId) {
          await tx.studentBadge.create({
            data: {
              studentId,
              badgeId: reward.badgeId,
              category: 'REWARD',
              tier: reward.rewardRarity,
              title: reward.badgeName || 'Mystery Badge',
              description: reward.personalizedMessage || 'Earned from Mystery Gift',
              icon: reward.badgeIcon || '🎁',
            },
          });
        }

        // ── Immutable claim record ──
        await tx.rewardClaim.create({
          data: {
            studentRewardId: rewardId,
            studentId,
            previousXpBalance: currentXp,
            previousCoinBalance: currentCoins,
            newXpBalance: currentXp + xpAwarded,
            newCoinBalance: finalCoinBalance,
          },
        });

        return {
          success: true,
          alreadyClaimed: false,
          xpAwarded,
          coinsAwarded,
          coinBalance: finalCoinBalance,
          message: `Reward claimed successfully! +${xpAwarded} XP${
            coinsAwarded > 0 ? ` and +${coinsAwarded} coins` : ''
          }`,
        };
      });
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      return {
        success: false,
        alreadyClaimed: false,
        message: error?.message || 'Failed to claim reward',
      };
    }
  }

  /**
   * Awards a streak rescue token
   */
  private async awardStreakRescueToken(studentId: string, rewardId: string) {
    await prisma.streakRescueToken.create({
      data: {
        studentId,
        awardedRewardId: rewardId,
        // Token is issued by a reward, not tied to a specific missed day yet;
        // the issue date records when it became available.
        missedDate: getFormattedDateInTz(),
        expiresAt: new Date(Date.now() + REWARD_CONFIG.STREAK_RESCUE_TOKEN_EXPIRY_DAYS * 86400000),
      },
    });
  }

  /**
   * Awards a leaderboard boost token
   */
  private async awardLeaderboardBoostToken(studentId: string, rewardId: string) {
    await prisma.leaderboardBoostToken.create({
      data: {
        studentId,
        awardedRewardId: rewardId,
        boostPercentage: 0.1, // 10% boost
        expiresAt: new Date(Date.now() + REWARD_CONFIG.LEADERBOARD_BOOST_TOKEN_EXPIRY_DAYS * 86400000),
      },
    });
  }

  /**
   * Generates a personalized message based on the weekly career-growth tier.
   */
  private generatePersonalizedMessage(tier: RewardTier, result: CareerGrowthResult): string {
    const score = Math.round(result.finalScore);
    const messages = {
      LEGENDARY: `Incredible career momentum! A ${score}/100 career growth week.`,
      EPIC: `Outstanding week of career progress — ${score}/100 career growth.`,
      RARE: `Great work! Your career growth reached ${score}/100 this week.`,
      COMMON: `Good job! You logged ${score}/100 career growth this week.`,
      COMEBACK: `Welcome back! Here is your weekly gift — keep building your career profile.`,
    };
    return messages[tier];
  }

  /**
   * Generates a reason earned message from the actual career-growth breakdown.
   */
  private generateReasonEarned(result: CareerGrowthResult): string {
    const parts: string[] = [];
    const internshipMilestones = result.categories.internshipApplications.milestones.length;
    const hackathonMilestones = result.categories.hackathonsCompetitions.milestones.length;
    const resumeScore = result.categories.resumeStrength.rawScore;

    if (internshipMilestones > 0) {
      parts.push(`${internshipMilestones} internship/job milestone${internshipMilestones > 1 ? 's' : ''}`);
    }
    if (hackathonMilestones > 0) {
      parts.push(`${hackathonMilestones} hackathon/competition milestone${hackathonMilestones > 1 ? 's' : ''}`);
    }
    if (resumeScore > 0) {
      parts.push(`resume strength ${Math.round(resumeScore)}/100`);
    }

    if (parts.length === 0) {
      return 'Weekly career growth gift — every active student receives a gift.';
    }
    return `Career growth this week: ${parts.join(', ')}.`;
  }

  /**
   * Gets available (unclaimed) rewards for a student
   */
  async getAvailableRewards(studentId: string) {
    return await prisma.studentReward.findMany({
      where: {
        studentId,
        status: 'ALLOCATED',
        expiresAt: { gt: new Date() },
      },
      orderBy: { allocatedAt: 'desc' },
    });
  }

  /**
   * Gets reward history for a student
   */
  async getRewardHistory(studentId: string) {
    return await prisma.studentReward.findMany({
      where: { studentId },
      orderBy: { allocatedAt: 'desc' },
      take: 20,
    });
  }
}

export const rewardEngine = new RewardEngine();
