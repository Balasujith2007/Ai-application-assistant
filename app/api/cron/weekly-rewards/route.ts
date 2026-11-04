import { NextResponse } from 'next/server';
import { rewardEngine, getWeekKey, getEvaluationPeriod } from '@/lib/gamification/rewardEngine';
import { REWARD_CONFIG } from '@/lib/gamification/rewardConfig';
import { championRewardEngine } from '@/lib/gamification/championRewardEngine';
import prisma from '@/lib/prisma';
import { RewardTriggerType } from '@prisma/client';

/**
 * POST /api/cron/weekly-rewards
 * Cron job endpoint to distribute weekly mystery gifts every Saturday
 * 
 * This endpoint should be called by a cron scheduler (e.g., Vercel Cron, GitHub Actions)
 * at the configured time (default: Saturday 9 AM in configured timezone)
 * 
 * The scheduler supports:
 * - Batch processing of students
 * - Idempotency (prevents duplicate allocations)
 * - Retry logic with exponential backoff
 * - Execution logging
 * - Comprehensive error handling
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  const weekKey = getWeekKey();
  const { startDate, endDate } = getEvaluationPeriod(weekKey);

  // Verify today is Saturday
  const today = new Date();
  const dayOfWeek = today.getDay();

  if (dayOfWeek !== REWARD_CONFIG.WEEKLY_DISTRIBUTION_DAY) {
    return NextResponse.json({
      success: false,
      message: `Weekly reward distribution runs only on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][REWARD_CONFIG.WEEKLY_DISTRIBUTION_DAY]}`,
      currentDay: dayOfWeek,
      weekKey,
    });
  }

  // Check if already run for this week
  const existingAllocation = await prisma.weeklyRewardAllocation.findUnique({
    where: { weekKey },
  });

  if (existingAllocation && existingAllocation.status === 'COMPLETED') {
    return NextResponse.json({
      success: true,
      message: 'Weekly rewards already distributed for this week',
      weekKey,
      allocation: existingAllocation,
    });
  }

  // Create or update allocation record
  const allocation = await prisma.weeklyRewardAllocation.upsert({
    where: { weekKey },
    create: {
      weekKey,
      evaluationStart: startDate,
      evaluationEnd: endDate,
      distributionDate: today,
      status: 'RUNNING',
      startedAt: new Date(),
    },
    update: {
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  let totalStudents = 0;
  let allocatedRewards = 0;
  let failedAllocations = 0;
  let legendaryCount = 0;
  let epicCount = 0;
  let rareCount = 0;
  let commonCount = 0;
  let comebackCount = 0;
  let championAllocated = 0;
  const errors: any[] = [];

  try {
    // Get all active students
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        active: true,
      },
      select: { id: true },
    });

    totalStudents = students.length;

    // Process in batches
    const batchSize = REWARD_CONFIG.WEEKLY_DISTRIBUTION_BATCH_SIZE;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (student) => {
          try {
            const result = await rewardEngine.evaluateAndAllocateWeeklyReward(
              student.id,
              weekKey
            );

            if (result.success && !result.alreadyAllocated) {
              allocatedRewards++;

              // Count by tier
              if (result.tier === 'LEGENDARY') legendaryCount++;
              else if (result.tier === 'EPIC') epicCount++;
              else if (result.tier === 'RARE') rareCount++;
              else if (result.tier === 'COMMON') commonCount++;
              else if (result.tier === 'COMEBACK') comebackCount++;
            }
          } catch (error: any) {
            failedAllocations++;
            errors.push({
              studentId: student.id,
              error: error?.message || 'Unknown error',
            });
          }
        })
      );
    }

    // Allocate Champion Rewards for Top 3 Students
    try {
      const championResult = await championRewardEngine.allocateChampionRewards(weekKey);
      championAllocated = championResult.championsAllocated;
      
      // If champion rewards are additional to weekly, champions get both
      // If champion rewards replace weekly, we need to skip weekly allocation for champions
      if (!REWARD_CONFIG.CHAMPION_REWARDS_ADDITIONAL_TO_WEEKLY) {
        // Remove weekly rewards for champion students (they get champion rewards instead)
        for (const detail of championResult.details) {
          if (detail.status === 'allocated') {
            // Find and remove the weekly reward for this student
            const weeklyReward = await prisma.studentReward.findFirst({
              where: {
                studentId: detail.studentId,
                evaluationWeekKey: weekKey,
                triggerType: RewardTriggerType.WEEKLY_SATURDAY,
              },
            });

            if (weeklyReward) {
              await prisma.studentReward.delete({
                where: { id: weeklyReward.id },
              });
              allocatedRewards--; // Adjust count
            }
          }
        }
      }
    } catch (error: any) {
      errors.push({
        type: 'CHAMPION_ALLOCATION',
        error: error?.message || 'Unknown error',
      });
    }

    // Update allocation record with final stats
    await prisma.weeklyRewardAllocation.update({
      where: { weekKey },
      data: {
        totalStudents,
        allocatedRewards,
        failedAllocations,
        legendaryCount,
        epicCount,
        rareCount,
        commonCount,
        comebackCount,
        status: 'COMPLETED',
        completedAt: new Date(),
        errorLog: errors.length > 0 ? errors : null,
      },
    });

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Weekly reward distribution completed',
      weekKey,
      duration,
      stats: {
        totalStudents,
        allocatedRewards,
        failedAllocations,
        championAllocated,
        tierDistribution: {
          legendary: legendaryCount,
          epic: epicCount,
          rare: rareCount,
          common: commonCount,
          comeback: comebackCount,
        },
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    // Update allocation record with error status
    await prisma.weeklyRewardAllocation.update({
      where: { weekKey },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorLog: {
          message: error?.message || 'Unknown error',
          stack: error?.stack,
        },
      },
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Weekly reward distribution failed',
        weekKey,
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/weekly-rewards
 * Returns the status of the current week's reward distribution
 */
export async function GET(req: Request) {
  const weekKey = getWeekKey();

  const allocation = await prisma.weeklyRewardAllocation.findUnique({
    where: { weekKey },
  });

  if (!allocation) {
    return NextResponse.json({
      success: true,
      weekKey,
      status: 'NOT_STARTED',
      message: 'Weekly reward distribution has not started yet',
    });
  }

  return NextResponse.json({
    success: true,
    weekKey,
    allocation,
  });
}
