import prisma from '@/lib/prisma';
import { REWARD_CONFIG, RewardTier } from './rewardConfig';
import { getFormattedDateInTz } from './checkInService';
import { RewardType, RewardRarity, RewardTriggerType, RewardStatus } from '@prisma/client';

/**
 * Mystery Gift & Weekly Reward Engine
 * Handles performance calculation, reward allocation, and eligibility logic
 */

interface PerformanceMetrics {
  lessonsCompleted: number;
  activeDays: number;
  assessmentScore: number;
  courseProgress: number;
  projectCompleted: boolean;
  streakMaintenance: number;
  achievementsCount: number;
}

interface WeeklyScoreResult {
  weightedScore: number;
  tier: RewardTier;
  metrics: PerformanceMetrics;
}

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
 * Calculates performance metrics for a student during the evaluation period
 */
async function calculatePerformanceMetrics(
  studentId: string,
  startDate: Date,
  endDate: Date
): Promise<PerformanceMetrics> {
  // 1. Lessons completed (from verified activities or check-ins)
  const dailyStreaks = await prisma.studentDailyStreak.findMany({
    where: {
      studentId,
      activityDate: {
        gte: getFormattedDateInTz(startDate),
        lte: getFormattedDateInTz(endDate),
      },
    },
  });

  const lessonsCompleted = dailyStreaks.length;

  // 2. Active days (unique dates with activity)
  const activeDays = new Set(dailyStreaks.map((s) => s.activityDate)).size;

  // 3. Assessment score (from points ledger - average score)
  const pointsResult = await prisma.pointsLedger.aggregate({
    where: {
      studentId,
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { pointsAwarded: true },
  });

  const assessmentScore = pointsResult._sum.pointsAwarded || 0;

  // 4. Course progress (estimated from total XP earned)
  const totalXpResult = await prisma.pointsLedger.aggregate({
    where: { studentId },
    _sum: { pointsAwarded: true },
  });

  const totalXp = totalXpResult._sum.pointsAwarded || 0;
  const courseProgress = Math.min(100, (totalXp / 1000) * 100); // Normalize to 100

  // 5. Project completed (from verified activities)
  const projectActivities = await prisma.verifiedActivity.findMany({
    where: {
      studentId,
      activityType: 'PROJECT_COMPLETION',
      occurredAt: { gte: startDate, lte: endDate },
    },
  });

  const projectCompleted = projectActivities.length > 0;

  // 6. Streak maintenance (current streak during evaluation period)
  const streakInfo = await prisma.studentDailyStreak.findMany({
    where: { studentId },
    orderBy: { activityDate: 'desc' },
    take: 30,
  });

  const currentStreak = streakInfo.length;

  // 7. Achievements count (badges earned during period)
  const badgesEarned = await prisma.studentBadge.count({
    where: {
      studentId,
      awardedAt: { gte: startDate, lte: endDate },
    },
  });

  return {
    lessonsCompleted,
    activeDays,
    assessmentScore,
    courseProgress,
    projectCompleted,
    streakMaintenance: currentStreak,
    achievementsCount: badgesEarned,
  };
}

/**
 * Calculates weighted score and determines reward tier
 */
function calculateWeightedScore(metrics: PerformanceMetrics): WeeklyScoreResult {
  const { SCORING_WEIGHTS, TIER_THRESHOLDS } = REWARD_CONFIG;

  // Normalize metrics to 0-100 scale
  const normalizedLessons = Math.min(100, (metrics.lessonsCompleted / 5) * 100);
  const normalizedActiveDays = Math.min(100, (metrics.activeDays / 5) * 100);
  const normalizedAssessment = Math.min(100, (metrics.assessmentScore / 100) * 100);
  const normalizedCourse = metrics.courseProgress;
  const normalizedStreak = Math.min(100, (metrics.streakMaintenance / 7) * 100);
  const normalizedAchievements = Math.min(100, (metrics.achievementsCount / 3) * 100);

  // Calculate weighted score
  const weightedScore =
    (normalizedLessons * SCORING_WEIGHTS.LESSONS_COMPLETED) / 100 +
    (normalizedActiveDays * SCORING_WEIGHTS.LEARNING_CONSISTENCY) / 100 +
    (normalizedAssessment * SCORING_WEIGHTS.ASSESSMENT_PERFORMANCE) / 100 +
    (normalizedCourse * SCORING_WEIGHTS.COURSE_PROJECT_PROGRESS) / 100 +
    (normalizedStreak * SCORING_WEIGHTS.STREAK_MAINTENANCE) / 100 +
    (normalizedAchievements * SCORING_WEIGHTS.ACHIEVEMENTS_MILESTONES) / 100;

  // Determine tier
  let tier: RewardTier = 'COMEBACK';
  if (weightedScore >= TIER_THRESHOLDS.LEGENDARY.min) tier = 'LEGENDARY';
  else if (weightedScore >= TIER_THRESHOLDS.EPIC.min) tier = 'EPIC';
  else if (weightedScore >= TIER_THRESHOLDS.RARE.min) tier = 'RARE';
  else if (weightedScore >= TIER_THRESHOLDS.COMMON.min) tier = 'COMMON';

  return { weightedScore, tier, metrics };
}

/**
 * Allocates a reward based on tier and RNG
 */
function allocateRewardByTier(tier: RewardTier): {
  rewardType: RewardType;
  rewardRarity: RewardRarity;
  xpAmount: number;
  coinAmount: number;
  badgeId?: string;
  badgeName?: string;
  badgeIcon?: string;
  profileFrameUrl?: string;
} {
  const { REWARD_VALUES } = REWARD_CONFIG;
  const rng = Math.random();

  const config = REWARD_VALUES[tier];

  // XP amount
  const xpAmount = Math.floor(
    Math.random() * (config.XP_MAX - config.XP_MIN + 1) + config.XP_MIN
  );

  // Coin amount
  const coinAmount = Math.floor(
    Math.random() * (config.COINS_MAX - config.COINS_MIN + 1) + config.COINS_MIN
  );

  let rewardType: RewardType = RewardType.BONUS_XP;
  let rewardRarity: RewardRarity = RewardRarity.COMMON;

  // Determine reward type based on tier and RNG
  if (tier === 'LEGENDARY') {
    rewardRarity = RewardRarity.LEGENDARY;
    if (rng < config.LEADERBOARD_BOOST_PROBABILITY) {
      rewardType = RewardType.LEADERBOARD_BOOST_TOKEN;
    } else if (rng < config.LEADERBOARD_BOOST_PROBABILITY + config.PROFILE_FRAME_PROBABILITY) {
      rewardType = RewardType.PROFILE_FRAME;
      profileFrameUrl = '/frames/legendary-gold.png';
    } else if (rng < config.EXCLUSIVE_BADGE_PROBABILITY) {
      rewardType = RewardType.EXCLUSIVE_BADGE;
      badgeId = 'LEGENDARY_PERFORMER';
      badgeName = 'Legendary Performer';
      badgeIcon = '👑';
    }
  } else if (tier === 'EPIC') {
    rewardRarity = RewardRarity.EPIC;
    if (rng < config.STREAK_RESCUE_PROBABILITY) {
      rewardType = RewardType.STREAK_RESCUE_TOKEN;
    } else if (rng < config.BADGE_PROBABILITY) {
      rewardType = RewardType.EXCLUSIVE_BADGE;
      badgeId = 'EPIC_ACHIEVER';
      badgeName = 'Epic Achiever';
      badgeIcon = '💎';
    }
  } else if (tier === 'RARE') {
    rewardRarity = RewardRarity.RARE;
    if (rng < config.BADGE_PROBABILITY) {
      rewardType = RewardType.EXCLUSIVE_BADGE;
      badgeId = 'RARE_FIND';
      badgeName = 'Rare Find';
      badgeIcon = '⭐';
    }
  } else if (tier === 'COMMON') {
    rewardRarity = RewardRarity.COMMON;
    if (coinAmount > 0) {
      rewardType = RewardType.BONUS_COINS;
    }
  } else {
    rewardRarity = RewardRarity.COMEBACK;
    rewardType = RewardType.BONUS_XP;
  }

  return {
    rewardType,
    rewardRarity,
    xpAmount,
    coinAmount,
    badgeId,
    badgeName,
    badgeIcon,
    profileFrameUrl,
  };
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
        studentId_weekKey_trigger: {
          studentId,
          evaluationWeekKey: weekKey,
          triggerType: RewardTriggerType.WEEKLY_SATURDAY,
        },
      },
    });

    if (existing) {
      return { success: true, alreadyAllocated: true, rewardId: existing.id };
    }

    // Get evaluation period
    const { startDate, endDate } = getEvaluationPeriod(weekKey);

    // Calculate performance metrics
    const metrics = await calculatePerformanceMetrics(studentId, startDate, endDate);

    // Calculate weighted score and tier
    const { weightedScore, tier } = calculateWeightedScore(metrics);

    // Allocate reward
    const reward = allocateRewardByTier(tier);

    // Create performance snapshot
    await prisma.weeklyPerformanceSnapshot.create({
      data: {
        studentId,
        weekKey,
        startDate,
        endDate,
        lessonsCompleted: metrics.lessonsCompleted,
        activeDays: metrics.activeDays,
        assessmentScore: metrics.assessmentScore,
        courseProgress: metrics.courseProgress,
        projectCompleted: metrics.projectCompleted,
        streakMaintenance: metrics.streakMaintenance,
        achievementsCount: metrics.achievementsCount,
        weightedScore,
        rankTier: tier,
      },
    });

    // Create student reward
    const studentReward = await prisma.studentReward.create({
      data: {
        studentId,
        rewardType: reward.rewardType,
        rewardRarity: reward.rewardRarity,
        triggerType: RewardTriggerType.WEEKLY_SATURDAY,
        status: RewardStatus.ALLOCATED,
        xpAmount: reward.xpAmount,
        coinAmount: reward.coinAmount,
        badgeId: reward.badgeId,
        badgeName: reward.badgeName,
        badgeIcon: reward.badgeIcon,
        profileFrameUrl: reward.profileFrameUrl,
        weeklyScore: weightedScore,
        weeklyRank: tier,
        performanceMetrics: metrics,
        evaluationWeekKey: weekKey,
        personalizedMessage: this.generatePersonalizedMessage(tier, metrics),
        reasonEarned: this.generateReasonEarned(tier, metrics),
        idempotencyKey: `${studentId}_${weekKey}_WEEKLY`,
        expiresAt: new Date(Date.now() + REWARD_CONFIG.REWARD_EXPIRY_DAYS * 86400000),
      },
    });

    // Award special tokens if applicable
    if (reward.rewardType === RewardType.STREAK_RESCUE_TOKEN) {
      await this.awardStreakRescueToken(studentId, studentReward.id);
    } else if (reward.rewardType === RewardType.LEADERBOARD_BOOST_TOKEN) {
      await this.awardLeaderboardBoostToken(studentId, studentReward.id);
    }

    return {
      success: true,
      alreadyAllocated: false,
      rewardId: studentReward.id,
      tier,
      score: weightedScore,
    };
  }

  /**
   * Claims a reward and applies it to the student's account
   */
  async claimReward(
    studentId: string,
    rewardId: string
  ): Promise<{
    success: boolean;
    alreadyClaimed: boolean;
    xpAwarded?: number;
    coinsAwarded?: number;
    message?: string;
  }> {
    const reward = await prisma.studentReward.findUnique({
      where: { id: rewardId },
      include: { student: true },
    });

    if (!reward) {
      return { success: false, alreadyClaimed: false, message: 'Reward not found' };
    }

    if (reward.studentId !== studentId) {
      return { success: false, alreadyClaimed: false, message: 'Reward does not belong to student' };
    }

    if (reward.status === RewardStatus.CLAIMED) {
      return { success: true, alreadyClaimed: true };
    }

    if (reward.status === RewardStatus.EXPIRED) {
      return { success: false, alreadyClaimed: false, message: 'Reward has expired' };
    }

    // Get current balances
    const currentXpResult = await prisma.pointsLedger.aggregate({
      where: { studentId },
      _sum: { pointsAwarded: true },
    });

    const currentXp = currentXpResult._sum.pointsAwarded || 0;
    const currentCoins = 0; // TODO: Implement coins system

    // Apply reward
    let xpAwarded = 0;
    let coinsAwarded = 0;

    if (reward.rewardType === RewardType.BONUS_XP && reward.xpAmount) {
      await prisma.pointsLedger.create({
        data: {
          studentId,
          verifiedActivityId: '', // Internal reward
          category: 'REWARD',
          pointsAwarded: reward.xpAmount,
          reason: `Mystery Gift: ${reward.personalizedMessage}`,
          periodKey: getWeekKey(),
        },
      });
      xpAwarded = reward.xpAmount;
    }

    if (reward.rewardType === RewardType.BONUS_COINS && reward.coinAmount) {
      // TODO: Implement coins ledger
      coinsAwarded = reward.coinAmount;
    }

    if (reward.rewardType === RewardType.EXCLUSIVE_BADGE && reward.badgeId) {
      await prisma.studentBadge.create({
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

    // Update reward status
    await prisma.studentReward.update({
      where: { id: rewardId },
      data: {
        status: RewardStatus.CLAIMED,
        claimedAt: new Date(),
      },
    });

    // Create claim record
    await prisma.rewardClaim.create({
      data: {
        studentRewardId: rewardId,
        studentId,
        previousXpBalance: currentXp,
        previousCoinBalance: currentCoins,
        newXpBalance: currentXp + xpAwarded,
        newCoinBalance: currentCoins + coinsAwarded,
      },
    });

    return {
      success: true,
      alreadyClaimed: false,
      xpAwarded,
      coinsAwarded,
      message: `Reward claimed successfully! +${xpAwarded} XP`,
    };
  }

  /**
   * Awards a streak rescue token
   */
  private async awardStreakRescueToken(studentId: string, rewardId: string) {
    await prisma.streakRescueToken.create({
      data: {
        studentId,
        awardedRewardId: rewardId,
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
   * Generates a personalized message based on tier and performance
   */
  private generatePersonalizedMessage(tier: RewardTier, metrics: PerformanceMetrics): string {
    const messages = {
      LEGENDARY: "Incredible performance! You've shown exceptional dedication.",
      EPIC: "Outstanding effort! Your consistency is truly impressive.",
      RARE: "Great work! You're making solid progress.",
      COMMON: "Good job! Keep up the momentum.",
      COMEBACK: "Welcome back! We're glad to see you continue your journey.",
    };
    return messages[tier];
  }

  /**
   * Generates a reason earned message
   */
  private generateReasonEarned(tier: RewardTier, metrics: PerformanceMetrics): string {
    if (tier === 'LEGENDARY') {
      return `Achieved ${metrics.activeDays} active days with ${metrics.achievementsCount} achievements`;
    }
    if (tier === 'EPIC') {
      return `Strong consistency with ${metrics.streakMaintenance} day streak`;
    }
    if (tier === 'RARE') {
      return `Completed ${metrics.lessonsCompleted} lessons with good assessment scores`;
    }
    if (tier === 'COMMON') {
      return `Active participation with ${metrics.activeDays} days of learning`;
    }
    return 'Returning to continue your learning journey';
  }

  /**
   * Gets available (unclaimed) rewards for a student
   */
  async getAvailableRewards(studentId: string) {
    return await prisma.studentReward.findMany({
      where: {
        studentId,
        status: RewardStatus.ALLOCATED,
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
