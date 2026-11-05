import prisma from '@/lib/prisma';
import type { RewardTriggerType } from '@prisma/client';
import { REWARD_CONFIG } from './rewardConfig';
import { getRewardConfig } from './rewardConfigService';

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

/** Category contributions read from `WeeklyPerformanceSnapshot.careerBreakdown`. */
interface CareerBreakdown {
  internship: number;
  hackathon: number;
  resume: number;
}

export class ChampionRewardEngine {
  /**
   * Identifies the top 3 students for a given week by their finalized weekly
   * Career Growth Score.
   *
   * Ranking reads the immutable `WeeklyPerformanceSnapshot` rows written by the
   * reward engine for the week (internship/job applications, hackathons &
   * competitions, resume strength). Tie-breaking is deterministic — category
   * contributions in weight order, then student id — so repeated runs always
   * produce the same champions.
   */
  async identifyTopThreeStudents(weekKey: string): Promise<ChampionReward[]> {
    const champions: ChampionReward[] = [];

    const config = await getRewardConfig();
    const championConfig = config.championRewards;

    const snapshots = await prisma.weeklyPerformanceSnapshot.findMany({
      where: { weekKey, student: { role: 'STUDENT', active: true } },
      select: {
        studentId: true,
        weightedScore: true,
        careerBreakdown: true,
        student: { select: { name: true } },
      },
    });

    const ranked = snapshots
      .map((snapshot) => ({
        studentId: snapshot.studentId,
        finalScore: snapshot.weightedScore ?? 0,
        breakdown: this.readBreakdown(snapshot.careerBreakdown),
      }))
      .sort(
        (a, b) =>
          b.finalScore - a.finalScore ||
          b.breakdown.internship - a.breakdown.internship ||
          b.breakdown.hackathon - a.breakdown.hackathon ||
          b.breakdown.resume - a.breakdown.resume ||
          a.studentId.localeCompare(b.studentId)
      )
      .slice(0, 3);

    ranked.forEach((entry, index) => {
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

  /** Reads the category contributions persisted in `careerBreakdown`. */
  private readBreakdown(raw: unknown): CareerBreakdown {
    const fallback: CareerBreakdown = { internship: 0, hackathon: 0, resume: 0 };
    if (!raw || typeof raw !== 'object') return fallback;
    const categories = (
      raw as {
        categories?: {
          internshipApplications?: { weightedPoints?: number };
          hackathonsCompetitions?: { weightedPoints?: number };
          resumeStrength?: { weightedPoints?: number };
        };
      }
    ).categories;
    if (!categories) return fallback;
    return {
      internship: categories.internshipApplications?.weightedPoints ?? 0,
      hackathon: categories.hackathonsCompetitions?.weightedPoints ?? 0,
      resume: categories.resumeStrength?.weightedPoints ?? 0,
    };
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
