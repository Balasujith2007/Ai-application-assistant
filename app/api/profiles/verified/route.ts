import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

/**
 * Returns the authenticated student's verified external profiles together with a
 * server-derived verification summary.
 *
 * The verification summary is computed exclusively from persisted backend records so
 * that the Profile page can render verification indicators only when their real
 * conditions are satisfied (never from frontend state or hardcoded values):
 *   - profileVerified   : a VerifiedProfile record reaching the VERIFIED state.
 *   - placementVerified : a real placement record (an Application marked SELECTED).
 *   - aiResumeSynced    : an active resume exists on file for the student.
 */
export async function GET(req: Request) {
  const emptySummary = {
    profileVerified: false,
    placementVerified: false,
    aiResumeSynced: false,
  };

  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: true, verifiedProfiles: [], verification: emptySummary },
        { status: 200 }
      );
    }

    const [verifiedProfiles, activeResumeCount, placedApplicationCount] = await Promise.all([
      prisma.verifiedProfile.findMany({ where: { studentId: userId } }),
      prisma.resume.count({ where: { userId, isActive: true } }),
      prisma.application.count({ where: { userId, status: 'SELECTED' } }),
    ]);

    const verification = {
      profileVerified: verifiedProfiles.some((vp: any) => vp.verificationStatus === 'VERIFIED'),
      placementVerified: placedApplicationCount > 0,
      aiResumeSynced: activeResumeCount > 0,
    };

    return NextResponse.json(
      { success: true, verifiedProfiles, verification },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching verified profiles:', error);
    return NextResponse.json(
      { success: true, verifiedProfiles: [], verification: emptySummary },
      { status: 200 }
    );
  }
}
