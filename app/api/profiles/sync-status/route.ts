import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { applyRateLimit } from '@/lib/security/rateLimit';
import { platformRegistry } from '@/lib/leaderboard/adapters/adapterRegistry';
import { EXTERNAL_VERIFIED_PLATFORMS } from '@/lib/leaderboard/types';
import { externalSyncStatus } from '@/lib/external-verification/syncStatusService';
import { externalActivityImporter } from '@/lib/external-verification/activityImporter';

/**
 * External account sync status + retry (Phase 1, Step 6).
 *
 * GET  /api/profiles/sync-status            -> connected platforms, ownership state,
 *                                              last successful sync, latest result,
 *                                              provider availability, streaks.
 * POST /api/profiles/sync-status            -> retry every connected platform.
 * POST /api/profiles/sync-status {platform} -> retry one platform.
 *
 * Unavailable providers are reported with `providerAvailable: false` and a reason;
 * they are never rendered as a zero-activity account.
 */
export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  }

  const limit = applyRateLimit(req, 'api', userId);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: limit.error }, { status: 429 });
  }

  try {
    const status = await externalSyncStatus.getStudentStatus(userId);
    return NextResponse.json({ success: true, ...status });
  } catch (error: any) {
    console.error('Error building external sync status:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Could not load sync status.' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  }

  const limit = applyRateLimit(req, 'api', userId);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, message: limit.error }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const requested = typeof body?.platform === 'string' ? body.platform.toUpperCase() : null;

  if (requested && !EXTERNAL_VERIFIED_PLATFORMS.includes(requested as any)) {
    return NextResponse.json(
      { success: false, message: `Retry is not supported for ${requested}.` },
      { status: 400 },
    );
  }

  try {
    if (!requested) {
      const result = await externalActivityImporter.syncStudent(userId);
      return NextResponse.json({ success: true, mode: 'ALL', ...result });
    }

    const [profile, verifiedRows] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.verifiedProfile.findMany({ where: { studentId: userId } }),
    ]);
    const adapter = platformRegistry.getAdapter(requested);
    if (!adapter) {
      return NextResponse.json({ success: false, message: `${requested} is not supported.` }, { status: 400 });
    }

    const verifiedRow = verifiedRows.find((v) => v.platform === requested);
    const storedUrl = (profile as any)?.[`${requested.toLowerCase()}Url`] as string | undefined;
    const username = verifiedRow?.username || (storedUrl ? adapter.parseUsernameFromUrl(storedUrl) : null);

    if (!username) {
      return NextResponse.json(
        { success: false, message: `Connect your ${requested} profile before syncing.` },
        { status: 409 },
      );
    }

    const result = await externalActivityImporter.importPlatform({ studentId: userId, platform: requested, username });
    return NextResponse.json({ success: true, mode: 'SINGLE', ...result });
  } catch (error: any) {
    console.error('Error during external sync retry:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Sync retry failed.' },
      { status: 500 },
    );
  }
}
