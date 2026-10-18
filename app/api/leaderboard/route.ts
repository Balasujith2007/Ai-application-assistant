import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { getAuthoritativeStudentClass, sanitizeLeaderboardEntry } from '@/lib/leaderboard/accessControl';
import { scoringEngine } from '@/lib/leaderboard/scoringEngine';
import { PeriodType } from '@/lib/leaderboard/types';
import { getPeriodDetails } from '@/lib/leaderboard/periodUtils';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access class leaderboard.' },
        { status: 401 }
      );
    }

    // 1. Authoritative Server-Side Class Membership Resolution
    const { student, classIdentity } = await getAuthoritativeStudentClass(userId);

    if (!classIdentity.isComplete) {
      return NextResponse.json({
        success: true,
        incompleteProfile: true,
        message: 'Please complete your academic profile (Department, Year, and Section) to view your verified class leaderboard.',
        classInfo: classIdentity,
      });
    }

    // 2. Parse Period Query Parameter
    const url = new URL(req.url);
    const rawPeriod = (url.searchParams.get('period') || 'all-time').toUpperCase();

    let periodType: PeriodType = 'ALL_TIME';
    if (rawPeriod === 'WEEKLY') periodType = 'WEEKLY';
    else if (rawPeriod === 'MONTHLY') periodType = 'MONTHLY';
    else if (rawPeriod === 'SEMESTER') periodType = 'SEMESTER';

    const periodDetails = getPeriodDetails(periodType);

    // 3. Compute Server-Side Scoped Class Leaderboard
    const { rankings, currentStudentEntry, categoryBreakdown, recommendations } =
      await scoringEngine.computeClassLeaderboard(classIdentity, periodType, userId);

    // 4. Calculate Aggregate Class Stats
    const totalStudents = rankings.length;
    const activeStudents = rankings.filter((r) => r.totalScore > 0).length;
    const totalScoresSum = rankings.reduce((acc, r) => acc + r.totalScore, 0);
    const averageScore = totalStudents > 0 ? Math.round((totalScoresSum / totalStudents) * 10) / 10 : 0;
    const highestScore = totalStudents > 0 ? Math.max(...rankings.map((r) => r.totalScore)) : 0;

    // 5. Get Connected Platforms & Freshness for current student
    const verifiedProfiles = await prisma.verifiedProfile.findMany({
      where: { studentId: userId },
      select: { platform: true, verifiedAt: true },
    });

    const connectedPlatforms = verifiedProfiles.map((p) => p.platform);
    const lastSyncedAt = currentStudentEntry?.lastSyncedAt || (verifiedProfiles[0]?.verifiedAt?.toISOString() ?? null);

    // 6. Sanitize Leaderboard Entries to prevent PII exposure
    const sanitizedRankings = rankings.map((r) => sanitizeLeaderboardEntry(r));

    return NextResponse.json({
      success: true,
      classInfo: {
        department: classIdentity.department,
        year: classIdentity.year,
        section: classIdentity.section,
        college: classIdentity.college,
        displayName: `${classIdentity.department} Year ${classIdentity.year}-${classIdentity.section}`,
      },
      period: periodDetails,
      stats: {
        totalStudents,
        activeStudents,
        averageScore,
        highestScore,
        currentUserRank: currentStudentEntry?.rank || null,
        currentUserScore: currentStudentEntry?.totalScore || null,
        currentUserPreviousRank: currentStudentEntry?.previousRank || null,
        rankMovement: currentStudentEntry?.rankMovement || 0,
      },
      currentStudent: {
        entry: currentStudentEntry ? sanitizeLeaderboardEntry(currentStudentEntry) : null,
        categoryBreakdown,
        recommendations,
        syncStatus: {
          lastSyncedAt,
          connectedPlatforms,
        },
      },
      rankings: sanitizedRankings,
    });
  } catch (error: any) {
    console.error('Error fetching class leaderboard:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch class leaderboard.' },
      { status: 500 }
    );
  }
}
