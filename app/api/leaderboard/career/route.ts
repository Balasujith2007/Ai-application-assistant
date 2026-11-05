import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

/**
 * GET /api/leaderboard/career
 * Returns career growth leaderboard rankings
 */
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, message: 'User not found or deactivated' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const weekKey = url.searchParams.get('weekKey') || getCurrentWeekKey();

    // Get current week's finalized snapshots
    const snapshots = await prisma.weeklyPerformanceSnapshot.findMany({
      where: { weekKey },
      orderBy: { weightedScore: 'desc' },
      take: 50,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                profilePhotoUrl: true,
              },
            },
          },
        },
      },
    });

    // Get previous week's snapshots for rank movement
    const previousWeekKey = getPreviousWeekKey(weekKey);
    const previousSnapshots = await prisma.weeklyPerformanceSnapshot.findMany({
      where: { weekKey: previousWeekKey },
      select: { studentId: true, weightedScore: true },
    });

    // Calculate previous ranks
    const previousRankMap = new Map(
      previousSnapshots
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .map((s, index) => [s.studentId, index + 1])
    );

    // Calculate rankings with rank movement
    const leaderboard = snapshots.map((snapshot, index) => {
      const currentRank = index + 1;
      const previousRank = previousRankMap.get(snapshot.studentId);
      let rankMovement: 'up' | 'down' | 'same' | 'new' = 'new';
      let movementValue = 0;

      if (previousRank !== undefined) {
        if (previousRank > currentRank) {
          rankMovement = 'up';
          movementValue = previousRank - currentRank;
        } else if (previousRank < currentRank) {
          rankMovement = 'down';
          movementValue = currentRank - previousRank;
        } else {
          rankMovement = 'same';
        }
      }

      const careerBreakdown = snapshot.careerBreakdown as any || {};

      return {
        rank: currentRank,
        studentId: snapshot.student.id,
        studentName: snapshot.student.name,
        profilePhotoUrl: snapshot.student.profile?.profilePhotoUrl,
        careerGrowthScore: snapshot.weightedScore,
        rankTier: snapshot.rankTier,
        internshipScore: careerBreakdown.internshipApplications || 0,
        hackathonScore: careerBreakdown.hackathonsCompetitions || 0,
        resumeScore: careerBreakdown.resumeStrength || 0,
        rankMovement,
        movementValue,
      };
    });

    // Get current student's rank
    const currentStudentSnapshot = snapshots.find((s) => s.student.id === userId);
    const currentStudentRank = currentStudentSnapshot
      ? leaderboard.findIndex((l) => l.studentId === userId) + 1
      : null;

    // Get category-wise performance for current student
    const studentSnapshot = await prisma.weeklyPerformanceSnapshot.findFirst({
      where: { studentId: userId, weekKey },
      select: { weightedScore: true, careerBreakdown: true },
    });

    const studentCareerBreakdown = (studentSnapshot?.careerBreakdown as any) || {};

    return NextResponse.json({
      success: true,
      weekKey,
      leaderboard,
      currentStudent: {
        rank: currentStudentRank,
        careerGrowthScore: studentSnapshot?.weightedScore || 0,
        internshipScore: studentCareerBreakdown.internshipApplications || 0,
        hackathonScore: studentCareerBreakdown.hackathonsCompetitions || 0,
        resumeScore: studentCareerBreakdown.resumeStrength || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching career leaderboard:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

function getCurrentWeekKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const weekNumber = getWeekNumber(now);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

function getPreviousWeekKey(currentWeekKey: string): string {
  const [year, weekPart] = currentWeekKey.split('-W');
  const yearNum = parseInt(year, 10);
  const weekNum = parseInt(weekPart, 10);

  if (weekNum === 1) {
    return `${yearNum - 1}-W52`;
  }
  return `${yearNum}-W${String(weekNum - 1).padStart(2, '0')}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
