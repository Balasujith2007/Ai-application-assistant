import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { codeforcesAdapter } from '@/lib/leaderboard/adapters/codeforcesAdapter';
import { verificationLedger } from '@/lib/leaderboard/verificationLedger';

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ valid: false, verified: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawUrl = body.codeforcesUrl || body.url || body.handle;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return NextResponse.json(
        { valid: false, verified: false, message: 'Codeforces profile URL or handle is required.' },
        { status: 400 }
      );
    }

    // Try extracting username from URL or use raw handle
    let username = codeforcesAdapter.parseUsernameFromUrl(rawUrl);
    if (!username && codeforcesAdapter.isValidUsername(rawUrl.trim())) {
      username = rawUrl.trim();
    }

    if (!username) {
      return NextResponse.json(
        {
          valid: false,
          verified: false,
          message: 'Please enter a valid Codeforces profile URL (e.g. https://codeforces.com/profile/username) or handle.',
        },
        { status: 400 }
      );
    }

    // Official Codeforces API verification
    const stats = await codeforcesAdapter.fetchUserStats(username);

    if (!stats.verified) {
      return NextResponse.json(
        {
          valid: false,
          verified: false,
          message: stats.error || 'Codeforces profile could not be verified (User not found).',
        },
        { status: 400 }
      );
    }

    const canonicalUrl = stats.profileUrl;

    // Save to verified_profiles table
    const verifiedProfile = await prisma.verifiedProfile.upsert({
      where: {
        studentId_platform: {
          studentId: userId,
          platform: 'CODEFORCES',
        },
      },
      update: {
        profileUrl: canonicalUrl,
        username: stats.username,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        publicMetadata: stats as any,
      },
      create: {
        studentId: userId,
        platform: 'CODEFORCES',
        profileUrl: canonicalUrl,
        username: stats.username,
        verificationStatus: 'VERIFIED',
        publicMetadata: stats as any,
      },
    });

    // Save codeforcesUrl to profile table
    await prisma.profile.upsert({
      where: { userId },
      update: { codeforcesUrl: canonicalUrl },
      create: { userId, codeforcesUrl: canonicalUrl },
    });

    // Automatically trigger ledger sync for this student
    await verificationLedger.syncStudentActivities(userId);

    return NextResponse.json({
      valid: true,
      verified: true,
      platform: 'CODEFORCES',
      username: stats.username,
      normalizedUrl: canonicalUrl,
      stats: {
        rating: stats.rating,
        maxRating: stats.maxRating,
        rankTier: stats.rankTier,
        contestsCount: stats.contestsCount,
      },
      verifiedProfile,
    });
  } catch (error: any) {
    console.error('Error verifying Codeforces profile:', error);
    return NextResponse.json(
      { valid: false, verified: false, message: 'Codeforces profile could not be verified.' },
      { status: 500 }
    );
  }
}
