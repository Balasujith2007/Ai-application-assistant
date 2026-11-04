import prisma from '@/lib/prisma';
import type { RewardTriggerType } from '@prisma/client';
import { REWARD_CONFIG } from './rewardConfig';
import { getRewardConfig } from './rewardConfigService';
import { getWeekKey, getEvaluationPeriod } from './rewardEngine';
import { scoringEngine } from '../leaderboard/scoringEngine';
import { getAuthoritativeStudentClass } from '../leaderboard/accessControl';

// String literal types matching schema enums.
// Run `npx prisma generate` to restore @prisma/client imports once the client
// has been regenerated after the reward-system migration.
type RewardRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'COMEBACK';

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
    const champions: ChampionReward[] = [];

    const config = await getRewardConfig();
    const championConfig = config.championRewards;

    // Get all active students
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', active: true },
      select: { id: true, name: true },
    });

    const leaderboardEntries: { studentId: string; studentName: string; totalScore: number; rank: number }[] = [];

    for (const student of students) {
      try {
        const { classIdentity } = await getAuthoritativeStudentClass(student.id);
        if (!classIdentity.isComplete) continue;

        const { rankings } = await scoringEngine.computeClassLeaderboard(
          classIdentity,
          'WEEKLY',
          student.id
        );

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
      }
    }

    // Sort by total score descending, take top 3
    leaderboardEntries.sort((a, b) => b.totalScore - a.totalScore);
    const topThree = leaderboardEntries.slice(0, 3);

    topThree.forEach((entry, index) => {
      const position = index + 1;
      const placeConfig =
        position === 1
          ? championConfig.first
          : position === 2
          ? championConfig.second
          : championConfig.third;

      champions.push({
        position,
        studentId: entry.studentId,
        reward: {
          xpAmount: placeConfig.xpAmount,
          coinAmount: placeConfig.coinAmount,
          badgeId: placeConfig.badgeId,
          badgeName: placeConfig.badgeName,
          badgeIcon: placeConfig.badgeIcon,
          profileFrameUrl: placeConfig.profileFrameUrl,
          title: placeConfig.title,
          rewardRarity: placeConfig.rewardRarity as RewardRarity,
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
    if (!(await getRewardConfig()).championRewards.enabled) {
      return { success: true, championsAllocated: 0, details: [] };
    }

    const champions = await this.identifyTopThreeStudents(weekKey);
    if (champions.length === 0) {
      return { success: true, championsAllocated: 0, details: [] };
    }

    const details: any[] = [];
    let championsAllocated = 0;

    for (const champion of champions) {
      try {
        const triggerType = this.getTriggerTypeForPosition(champion.position);

        const existing = await prisma.studentReward.findUnique({
          where: {
            StudentReward_studentId_weekKey_trigger_unique: {
              studentId: champion.studentId,
              evaluationWeekKey: weekKey,
              triggerType,
            },
          },
        });

        if (existing) {
          details.push({ position: champion.position, studentId: champion.studentId, status: 'already_allocated' });
          continue;
        }

        const studentReward = await prisma.studentReward.create({
          data: {
            studentId: champion.studentId,
            rewardType: 'BONUS_XP',
            rewardRarity: champion.reward.rewardRarity,
            triggerType,
            status: 'ALLOCATED',
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
        details.push({ position: champion.position, studentId: champion.studentId, rewardId: studentReward.id, status: 'allocated' });
      } catch (error: any) {
        console.error(`Error allocating champion reward for position ${champion.position}:`, error);
        details.push({ position: champion.position, studentId: champion.studentId, status: 'failed', error: error?.message });
      }
    }

    return { success: true, championsAllocated, details };
  }

  private getTriggerTypeForPosition(position: number): RewardTriggerType {
    switch (position) {
      case 1: return 'CHAMPION_FIRST_PLACE';
      case 2: return 'CHAMPION_SECOND_PLACE';
      case 3: return 'CHAMPION_THIRD_PLACE';
      default: throw new Error(`Invalid champion position: ${position}`);
    }
  }

  private getPositionLabel(position: number): string {
    switch (position) {
      case 1: return 'First Place';
      case 2: return 'Second Place';
      case 3: return 'Third Place';
      default: return `${position}th Place`;
    }
  }

  private generateChampionMessage(position: number): string {
    switch (position) {
      case 1: return '🏆 INCREDIBLE! You are the CHAMPION of the week!';
      case 2: return '🥈 Outstanding! You achieved Second Place!';
      case 3: return '🥉 Excellent! You are a Rising Champion!';
      default: return 'Amazing performance!';
    }
  }

  async isStudentChampion(studentId: string, weekKey: string): Promise<{ isChampion: boolean; position?: number }> {
    const championReward = await prisma.studentReward.findFirst({
      where: {
        studentId,
        evaluationWeekKey: weekKey,
        triggerType: {
          in: ['CHAMPION_FIRST_PLACE', 'CHAMPION_SECOND_PLACE', 'CHAMPION_THIRD_PLACE'],
        },
      },
    });

    if (!championReward) return { isChampion: false };
    return { isChampion: true, position: championReward.championPosition || 0 };
  }

  async getChampionHistory(studentId: string) {
    return prisma.studentReward.findMany({
      where: {
        studentId,
        triggerType: {
          in: ['CHAMPION_FIRST_PLACE', 'CHAMPION_SECOND_PLACE', 'CHAMPION_THIRD_PLACE'],
        },
      },
      orderBy: { allocatedAt: 'desc' },
    });
  }
}

export const championRewardEngine = new ChampionRewardEngine();
