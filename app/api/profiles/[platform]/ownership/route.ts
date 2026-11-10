import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/security/rateLimit';
import { platformRegistry } from '@/lib/leaderboard/adapters/adapterRegistry';
import { normalizeOwnershipStatus } from '@/lib/external-verification/ownershipStatus';
import { ownershipVerification } from '@/lib/external-verification/ownershipService';

/**
 * Account ownership verification for an external competitive-programming profile.
 *
 * The platform-specific profile URL fields already stored on the Profile model are
 * the single source of the connected handle; this route never accepts a URL that
 * is not already connected, so a student cannot claim someone else's handle.
 *
 * GET  /api/profiles/[platform]/ownership  -> issue/return the public-profile challenge
 * POST /api/profiles/[platform]/ownership  -> re-read the public field and persist the state
 *
 * No password, session cookie or private token is ever requested or accepted.
 */

const SUPPORTED = ['LEETCODE', 'CODECHEF', 'ATCODER', 'CODEFORCES', 'CODOLIO'];

const URL_FIELD_BY_PLATFORM: Record<string, string> = {
  LEETCODE: 'leetcodeUrl',
  CODECHEF: 'codechefUrl',
  CODEFORCES: 'codeforcesUrl',
  CODOLIO: 'codolioUrl',
};

export async function GET(req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const { platform: rawPlatform } = await ctx.params;
  const platform = (rawPlatform || '').toUpperCase();

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  }

  const limit = applyRateLimit(req, 'api', userId);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: limit.error }, { status: 429 });
  }

  if (!SUPPORTED.includes(platform)) {
    return NextResponse.json(
      { success: false, supported: false, message: `Ownership verification is not available for ${platform}.` },
      { status: 400 },
    );
  }

  try {
    const connection = await resolveConnection(userId, platform);
    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          supported: false,
          message: `Connect your ${platform} profile first, then start ownership verification.`,
        },
        { status: 409 },
      );
    }

    const challenge = await ownershipVerification.startChallenge(userId, platform, connection.username);

    const existing = await prisma.verifiedProfile.findUnique({
      where: { studentId_platform: { studentId: userId, platform } },
    });

    return NextResponse.json({
      success: true,
      platform,
      username: connection.username,
      supported: challenge.supported,
      token: challenge.token ?? null,
      fieldLabel: challenge.fieldLabel ?? null,
      instructions: challenge.instructions ?? challenge.reason ?? null,
      ownershipStatus: normalizeOwnershipStatus(existing?.verificationStatus),
    });
  } catch (error: any) {
    console.error('Ownership challenge error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Could not start ownership verification.' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const { platform: rawPlatform } = await ctx.params;
  const platform = (rawPlatform || '').toUpperCase();

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  }

  const limit = applyRateLimit(req, 'api', userId);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: limit.error }, { status: 429 });
  }

  if (!SUPPORTED.includes(platform)) {
    return NextResponse.json(
      { success: false, supported: false, message: `Ownership verification is not available for ${platform}.` },
      { status: 400 },
    );
  }

  try {
    const connection = await resolveConnection(userId, platform);
    if (!connection) {
      return NextResponse.json(
        { success: false, message: `Connect your ${platform} profile first.` },
        { status: 409 },
      );
    }

    const outcome = await ownershipVerification.verifyOwnership(userId, platform, connection.username);
    const persisted = await ownershipVerification.persistOutcome(
      userId,
      platform,
      connection.username,
      outcome,
    );

    return NextResponse.json({
      success: true,
      platform,
      username: outcome.username,
      ownershipStatus: outcome.status,
      ownershipProven: outcome.ownershipProven,
      fieldLabel: outcome.fieldLabel ?? null,
      detail: outcome.detail,
      checkedAt: outcome.checkedAt,
      verifiedProfile: { ...persisted, ownershipStatus: outcome.status, ownershipVerified: outcome.ownershipProven },
    });
  } catch (error: any) {
    console.error('Ownership verification error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Ownership verification failed.' },
      { status: 500 },
    );
  }
}

/**
 * Resolves the connected handle for a platform from the already-stored profile
 * URL. Returns null when the student has not connected the platform.
 */
async function resolveConnection(
  userId: string,
  platform: string,
): Promise<{ username: string; profileUrl: string } | null> {
  const adapter = platformRegistry.getAdapter(platform);
  if (!adapter) return null;

  const urlField = URL_FIELD_BY_PLATFORM[platform];
  const [profile, verifiedProfile] = await Promise.all([
    urlField ? prisma.profile.findUnique({ where: { userId } }) : Promise.resolve(null),
    prisma.verifiedProfile.findUnique({ where: { studentId_platform: { studentId: userId, platform } } }),
  ]);

  const storedUrl = (profile as any)?.[urlField] || verifiedProfile?.profileUrl;
  const username =
    verifiedProfile?.username || (storedUrl ? adapter.parseUsernameFromUrl(storedUrl) : null) || null;

  if (!username) return null;
  return { username, profileUrl: storedUrl || adapter.getCanonicalUrl(username) };
}
