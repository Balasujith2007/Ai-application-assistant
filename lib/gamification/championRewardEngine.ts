import prisma from '@/lib/prisma';
import { REWARD_CONFIG } from './rewardConfig';
import { getWeekKey, getEvaluationPeriod } from './rewardEngine';
import { RewardType, RewardRarity, RewardTriggerType, RewardStatus } from '@prisma/client';
import { scoringEngine } from '../leaderboard/scoringEngine';
import { getAuthoritativeStudentClass } from '../leaderboard/accessControl';

// Define PeriodType locally to avoid import issues
type PeriodType = 'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'ALL_TIME';

/**
 * Top 3 Champion Exclusive Reward Engine
 * Identifies and rewards the top 3 students on the leaderboard each week
 */

interface ChampionReward {
  position: number; // 1, 2, or 3
  studentId: string;
  reward: {
    xpAmount: number;
    coinAmount: number;
    badgeId: string;
    badgeName: string;
    badgeIcon: string;
    profileFrameUrl: string;
    title: string;
    rewardRarity: RewardRarity;
  };
}

export class ChampionRewardEngine {
  /**
   * Identifies the top 3 students from the leaderboard for a given week
   */
  async identifyTopThreeStudents(weekKey: string): Promise<ChampionReward[]> {
    const { startDate, endDate } = getEvaluationPeriod(weekKey);
    const champions: ChampionReward[] = [];

    // Get all active students
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        active: true,
      },
      select: { id: true, name: true },
    });

    // Calculate leaderboard for each student (using existing scoring engine)
    const leaderboardEntries = [];

    for (const student of students) {
      try {
        const { classIdentity } = await getAuthoritativeStudentClass(student.id);
        
        if (!classIdentity.isComplete) {
          continue; // Skip students without complete profile
        }

        const { rankings } = await scoringEngine.computeClassLeaderboard(
          classIdentity,
          PeriodType.WEEKLY,
          student.id
        );

        // Find this student's rank
        const studentEntry = rankings.find((r) => r.studentId === student.id);
        if (studentEntry) {
          leaderboardEntries.push({
            studentId: student.id,
            studentName: student.name,
            totalScore: studentEntry.totalScore,
            rank: studentEntry.rank,
          });
        }
      } catch (error) {
        console.error(`Error calculating leaderboard for student ${student.id}:`, error);
        continue;
      }
    }

    // Sort by total score (descending) and take top 3
    leaderboardEntries.sort((a, b) => b.totalScore - a.totalScore);
    const topThree = leaderboardEntries.slice(0, 3);

    // Map to champion rewards
    topThree.forEach((entry, index) => {
      const position = index + 1;
      let rewardConfig;

      if (position === 1) {
        rewardConfig = REWARD_CONFIG.CHAMPION_FIRST_PLACE;
      } else if (position === 2) {
        rewardConfig = REWARD_CONFIG.CHAMPION_SECOND_PLACE;
      } else {
        rewardConfig = REWARD_CONFIG.CHAMPION_THIRD_PLACE;
      }

      champions.push({
        position,
        studentId: entry.studentId,
        reward: {
          xpAmount: rewardConfig.XP_AMOUNT,
          coinAmount: rewardConfig.COIN_AMOUNT,
          badgeId: rewardConfig.BADGE_ID,
          badgeName: rewardConfig.BADGE_NAME,
          badgeIcon: rewardConfig.BADGE_ICON,
          profileFrameUrl: rewardConfig.PROFILE_FRAME_URL,
          title: rewardConfig.TITLE,
          rewardRarity: rewardConfig.REWARD_RARITY as RewardRarity,
        },
      });
    });

    return champions;
  }

  /**
   * Allocates champion rewards for the top 3 students
   */
  async allocateChampionRewards(weekKey: string): Promise<{
    success: boolean;
    championsAllocated: number;
    details: any[];
  }> {
    if (!REWARD_CONFIG.CHAMPION_REWARDS_ENABLED) {
      return { success: true, championsAllocated: 0, details: [] };
    }

    // Identify top 3 students
    const champions = await this.identifyTopThreeStudents(weekKey);

    if (champions.length === 0) {
      return { success: true, championsAllocated: 0, details: [] };
    }

    const details: any[] = [];
    let championsAllocated = 0;

    for (const champion of champions) {
      try {
        // Check if already allocated champion reward for this week
        const existing = await prisma.studentReward.findUnique({
          where: {
            studentId_weekKey_trigger: {
              studentId: champion.studentId,
              evaluationWeekKey: weekKey,
              triggerType: this.getTriggerTypeForPosition(champion.position),
            },
          },
        });

        if (existing) {
          details.push({
            position: champion.position,
            studentId: champion.studentId,
            status: 'already_allocated',
          });
          continue;
        }

        // Create champion reward
        const triggerType = this.getTriggerTypeForPosition(champion.position);

        const studentReward = await prisma.studentReward.create({
          data: {
            studentId: champion.studentId,
            rewardType: RewardType.BONUS_XP, // Champion rewards include XP
            rewardRarity: champion.reward.rewardRarity,
            triggerType,
            status: RewardStatus.ALLOCATED,
            xpAmount: champion.reward.xpAmount,
            coinAmount: champion.reward.coinAmount,
            badgeId: champion.reward.badgeId,
            badgeName: champion.reward.badgeName,
            badgeIcon: champion.reward.badgeIcon,
            profileFrameUrl: champion.reward.profileFrameUrl,
            championPosition: champion.position,
            evaluationWeekKey: weekKey,
            personalizedMessage: this.generateChampionMessage(champion.position),
            reasonEarned: `Achieved ${this.getPositionLabel(champion.position)} in weekly leaderboard`,
            idempotencyKey: `${champion.studentId}_${weekKey}_CHAMPION_${champion.position}`,
            expiresAt: new Date(Date.now() + REWARD_CONFIG.REWARD_EXPIRY_DAYS * 86400000),
          },
        });

        championsAllocated++;
        details.push({
          position: champion.position,
          studentId: champion.studentId,
          rewardId: studentReward.id,
          status: 'allocated',
        });
      } catch (error: any) {
        console.error(`Error allocating champion reward for position ${champion.position}:`, error);
        details.push({
          position: champion.position,
          studentId: champion.studentId,
          status: 'failed',
          error: error?.message,
        });
      }
    }

    return {
      success: true,
      championsAllocated,
      details,
    };
  }

  /**
   * Gets the trigger type for a champion position
   */
  private getTriggerTypeForPosition(position: number): RewardTriggerType {
    switch (position) {
      case 1:
        return RewardTriggerType.CHAMPION_FIRST_PLACE;
      case 2:
        return RewardTriggerType.CHAMPION_SECOND_PLACE;
      case 3:
        return RewardTriggerType.CHAMPION_THIRD_PLACE;
      default:
        throw new Error(`Invalid champion position: ${position}`);
    }
  }

  /**
   * Gets the position label (First Place, Second Place, etc.)
   */
  private getPositionLabel(position: number): string {
    switch (position) {
      case 1:
        return 'First Place';
      case 2:
        return 'Second Place';
      case 3:
        return 'Third Place';
      default:
        return `${position}th Place`;
    }
  }

  /**
   * Generates a personalized champion message
   */
  private generateChampionMessage(position: number): string {
    switch (position) {
      case 1:
        return '🏆 INCREDIBLE! You are the CHAMPION of the week!';
      case 2:
        return '🥈 Outstanding! You achieved Second Place!';
      case 3:
        return '🥉 Excellent! You are a Rising Champion!';
      default:
        return 'Amazing performance!';
    }
  }

  /**
   * Checks if a student is a champion for a given week
   */
  async isStudentChampion(studentId: string, weekKey: string): Promise<{
    isChampion: boolean;
    position?: number;
  }> {
    const championReward = await prisma.studentReward.findFirst({
      where: {
        studentId,
        evaluationWeekKey: weekKey,
        triggerType: {
          in: [
            RewardTriggerType.CHAMPION_FIRST_PLACE,
            RewardTriggerType.CHAMPION_SECOND_PLACE,
            RewardTriggerType.CHAMPION_THIRD_PLACE,
          ],
        },
      },
    });

    if (!championReward) {
      return { isChampion: false };
    }

    return {
      isChampion: true,
      position: championReward.championPosition || 0,
    };
  }

  /**
   * Gets champion history for a student
   */
  async getChampionHistory(studentId: string) {
    return await prisma.studentReward.findMany({
      where: {
        studentId,
        triggerType: {
          in: [
            RewardTriggerType.CHAMPION_FIRST_PLACE,
            RewardTriggerType.CHAMPION_SECOND_PLACE,
            RewardTriggerType.CHAMPION_THIRD_PLACE,
          ],
        },
      },
      orderBy: { allocatedAt: 'desc' },
    });
  }
}

export const championRewardEngine = new ChampionRewardEngine();
