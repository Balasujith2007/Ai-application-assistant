import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { normalizeOwnershipStatus } from '@/lib/external-verification/ownershipStatus';

/**
 * Returns the authenticated student's verified external profiles together with a
 * server-derived verification summary.
 *
 * Ownership semantics (Phase 1, Step 4): a stored profile is NOT the same as a
 * proven account. `profileExists` only means a public handle was found;
 * `ownershipVerified` requires the public-profile challenge to have been
 * satisfied. Downstream badge logic must gate on `ownershipVerified`.
 *
 * The verification summary is computed exclusively from persisted backend records so
 * that the Profile page can render verification indicators only when their real
 * conditions are satisfied (never from frontend state or hardcoded values):
 *   - profileVerified   : alias of `ownershipVerified` (retained for callers).
 *   - placementVerified : a real placement record (an Application marked SELECTED).
 *   - aiResumeSynced    : an active resume exists on file for the student.
 */
export async function GET(req: Request) {
  const emptySummary = {
    profileExists: false,
    ownershipVerified: false,
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

    const profiles = verifiedProfiles.map((vp: any) => {
      const ownershipStatus = normalizeOwnershipStatus(vp.verificationStatus);
      return {
        ...vp,
        ownershipStatus,
        ownershipVerified: ownershipStatus === 'OWNERSHIP_VERIFIED',
      };
    });

    const ownershipVerified = profiles.some((vp) => vp.ownershipVerified);

    const verification = {
      profileExists: profiles.length > 0,
      ownershipVerified,
      profileVerified: ownershipVerified,
      placementVerified: placedApplicationCount > 0,
      aiResumeSynced: activeResumeCount > 0,
    };

    return NextResponse.json(
      { success: true, verifiedProfiles: profiles, verification },
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
