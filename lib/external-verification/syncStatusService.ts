import prisma from '@/lib/prisma';
import { platformRegistry } from '@/lib/leaderboard/adapters/adapterRegistry';
import {
  OwnershipCapability,
  ProviderApiKind,
  ProviderDataFreshness,
} from '@/lib/leaderboard/adapters/providerTypes';
import { EXTERNAL_VERIFIED_PLATFORMS } from '@/lib/leaderboard/types';
import { OwnershipStatus, normalizeOwnershipStatus } from './ownershipStatus';
import { computePlatformStreaks, DEFAULT_STREAK_TIME_ZONE, PlatformStreakSummary } from './platformStreak';

/**
 * Student-facing external-account sync status (Phase 1, Step 6).
 *
 * Every field is derived from persisted records or from a provider's declared
 * capabilities. When a provider has never been contacted, or is known to be
 * unavailable, the corresponding value is `null`/`unavailable` — never `0` — so
 * the UI can never misrepresent "no data" as "no activity".
 */

export interface PlatformCapabilityView {
  apiKind: ProviderApiKind;
  dataFreshness: ProviderDataFreshness;
  ownership: OwnershipCapability;
  supported: string[];
  unsupported: string[];
  notes: string[];
}

export interface PlatformSyncStatus {
  platform: string;
  label: string;
  connected: boolean;
  username: string | null;
  profileUrl: string | null;
  ownershipStatus: OwnershipStatus;
  ownershipVerified: boolean;
  /** Whether this provider even offers a credential-free ownership challenge. */
  ownershipChallengeSupported: boolean;
  capabilities: PlatformCapabilityView;
  lastAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  latestSyncResult: 'SUCCESS' | 'FAILED' | 'NEVER' | 'UNAVAILABLE';
  latestSyncError: { code: string | null; message: string | null } | null;
  /** null = no successful sync yet; a failed provider is NOT reported as 0. */
  recordsProcessed: number | null;
  providerAvailable: boolean | null;
  unavailableReason: string | null;
  streak: PlatformStreakSummary | null;
  canRetry: boolean;
}

export interface StudentSyncStatusResponse {
  studentId: string;
  generatedAt: string;
  timeZone: string;
  connectedPlatforms: string[];
  verifiedPlatforms: string[];
  unverifiedPlatforms: string[];
  platforms: PlatformSyncStatus[];
  lastSuccessfulSyncAt: string | null;
  failedProviderCount: number;
}

const PLATFORM_LABELS: Record<string, string> = {
  LEETCODE: 'LeetCode',
  CODECHEF: 'CodeChef',
  ATCODER: 'AtCoder',
  CODEFORCES: 'Codeforces',
  CODOLIO: 'Codolio',
};

const CAPABILITY_LABELS = {
  profileLookup: 'Profile lookup',
  dailyActivity: 'Daily activity',
  acceptedSubmissions: 'Accepted submissions',
  submissionTimestamps: 'Submission timestamps',
  contestHistory: 'Contest history',
  ratingHistory: 'Rating history',
} as const;

export class ExternalSyncStatusService {
  async getStudentStatus(studentId: string): Promise<StudentSyncStatusResponse> {
    const timeZone = DEFAULT_STREAK_TIME_ZONE;
    const since = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);

    const [profile, verifiedProfiles, syncRows, activityRows] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: studentId } }),
      prisma.verifiedProfile.findMany({ where: { studentId } }),
      prisma.syncHistory.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.verifiedActivity.findMany({
        where: {
          studentId,
          sourceType: 'CONTEST',
          occurredAt: { gte: since },
        },
        select: { sourcePlatform: true, occurredAt: true },
      }),
    ]);

    const streaks = computePlatformStreaks(
      activityRows
        .filter((a) => a.occurredAt)
        .map((a) => ({ sourcePlatform: a.sourcePlatform, occurredAt: a.occurredAt as Date })),
      { timeZone },
    );
    const streakByPlatform = new Map(streaks.map((s) => [s.platform, s]));

    const platforms: PlatformSyncStatus[] = [];
    let latestSuccessfulOverall: string | null = null;
    let failedProviderCount = 0;

    for (const platform of EXTERNAL_VERIFIED_PLATFORMS) {
      const adapter = platformRegistry.getAdapter(platform);
      if (!adapter) continue;
      const provider = platformRegistry.getProvider(platform);
      const caps = provider?.getProviderCapabilities();

      const verifiedRow = verifiedProfiles.find((v) => v.platform === platform);
      const urlField = `${platform.toLowerCase()}Url`;
      const storedUrl = (profile as any)?.[urlField] as string | undefined;
      const username =
        verifiedRow?.username || (storedUrl ? adapter.parseUsernameFromUrl(storedUrl) : null) || null;
      const connected = Boolean(username);

      const platformSyncs = syncRows.filter((s) => s.sourcePlatform === platform);
      const latest = platformSyncs[0] ?? null;
      const lastSuccess = platformSyncs.find((s) => s.status === 'SUCCESS') ?? null;

      if (lastSuccess?.lastSuccessfulSyncAt) {
        const iso = lastSuccess.lastSuccessfulSyncAt.toISOString();
        if (!latestSuccessfulOverall || iso > latestSuccessfulOverall) latestSuccessfulOverall = iso;
      }

      const providerAvailable = latest ? latest.status === 'SUCCESS' : null;
      const unavailableReason =
        latest && latest.status !== 'SUCCESS'
          ? latest.errorMessage || `Provider reported ${latest.errorCode ?? 'an error'}.`
          : null;
      if (latest && latest.status !== 'SUCCESS') failedProviderCount++;

      const ownershipStatus = normalizeOwnershipStatus(verifiedRow?.verificationStatus);

      const readable = CAPABILITY_LABELS;
      const supported: string[] = [];
      const unsupported: string[] = [];
      if (caps) {
        for (const [key, label] of Object.entries(readable)) {
          if ((caps as any)[key]) supported.push(label);
          else unsupported.push(label);
        }
      }

      platforms.push({
        platform,
        label: PLATFORM_LABELS[platform] ?? platform,
        connected,
        username,
        profileUrl: verifiedRow?.profileUrl ?? storedUrl ?? null,
        ownershipStatus,
        ownershipVerified: ownershipStatus === 'OWNERSHIP_VERIFIED',
        ownershipChallengeSupported: caps?.ownership === 'PROFILE_CHALLENGE',
        capabilities: {
          apiKind: caps?.apiKind ?? 'SCRAPED',
          dataFreshness: caps?.dataFreshness ?? 'NONE',
          ownership: caps?.ownership ?? 'NONE',
          supported,
          unsupported,
          notes: caps?.notes ?? [],
        },
        lastAttemptAt: latest?.lastAttemptAt?.toISOString() ?? null,
        lastSuccessfulSyncAt: lastSuccess?.lastSuccessfulSyncAt?.toISOString() ?? null,
        latestSyncResult: !latest ? (connected ? 'NEVER' : 'NEVER') : (latest.status as 'SUCCESS' | 'FAILED'),
        latestSyncError: latest && latest.status !== 'SUCCESS'
          ? { code: latest.errorCode ?? null, message: latest.errorMessage ?? null }
          : null,
        recordsProcessed: lastSuccess ? lastSuccess.recordsProcessed : null,
        providerAvailable,
        unavailableReason,
        streak: streakByPlatform.get(platform) ?? null,
        canRetry: connected,
      });
    }

    const connectedPlatforms = platforms.filter((p) => p.connected).map((p) => p.platform);
    const verifiedPlatforms = platforms.filter((p) => p.ownershipVerified).map((p) => p.platform);

    return {
      studentId,
      generatedAt: new Date().toISOString(),
      timeZone,
      connectedPlatforms,
      verifiedPlatforms,
      unverifiedPlatforms: connectedPlatforms.filter((p) => !verifiedPlatforms.includes(p)),
      platforms,
      lastSuccessfulSyncAt: latestSuccessfulOverall,
      failedProviderCount,
    };
  }
}

export const externalSyncStatus = new ExternalSyncStatusService();
