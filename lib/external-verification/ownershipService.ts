import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { platformRegistry } from '@/lib/leaderboard/adapters/adapterRegistry';
import { ProviderId } from '@/lib/leaderboard/adapters/providerTypes';
import { OwnershipStatus } from './ownershipStatus';

/**
 * Account-ownership verification (Phase 1, Step 4).
 *
 * Profile existence is confirmed by simply looking a handle up. Ownership is a
 * different claim: that the student controls the account. This service proves
 * ownership with a *public profile challenge* — the student writes a
 * deterministic, per-student token into a public field of their own profile and
 * the server re-reads that anonymous public field. No password, session cookie,
 * private token, or OAuth grant is ever requested or stored.
 *
 * Providers with no public editable field (CodeChef, AtCoder, Codolio) cannot
 * satisfy the challenge; for those the service reports `unsupported` and the
 * account stays at PROFILE_EXISTS rather than being marked verified.
 */

export const OWNERSHIP_PROOF_METHOD = 'PROFILE_CHALLENGE_TOKEN';
const TOKEN_PREFIX = 'CAREERAI-VERIFY';

export interface OwnershipChallengeSpec {
  supported: boolean;
  provider: ProviderId;
  username: string;
  /** Present only when `supported` is true. */
  token?: string;
  fieldLabel?: string;
  instructions?: string;
  reason?: string;
}

export interface OwnershipVerificationOutcome {
  provider: ProviderId;
  username: string;
  status: OwnershipStatus;
  /** True only when the challenge token was found in the public field. */
  ownershipProven: boolean;
  method: string;
  fieldLabel?: string;
  checkedAt: string;
  detail: string;
}

/**
 * The challenge token is an HMAC over the student + platform + handle so it is
 * (a) unguessable, (b) different for every student even for the same handle, and
 * (c) verifiable without storing any per-challenge state.
 */
function challengeSecret(): string | null {
  const secret = process.env.OWNERSHIP_CHALLENGE_SECRET || process.env.JWT_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}

export function buildChallengeToken(
  studentId: string,
  provider: ProviderId,
  username: string,
): string | null {
  const secret = challengeSecret();
  if (!secret) return null;
  const payload = `${studentId}|${provider}|${username.trim().toLowerCase()}`;
  const digest = crypto.createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 22);
  return `${TOKEN_PREFIX}-${digest}`;
}

/** Normalizes free text so a token survives casing, spacing and zero-width noise. */
export function normalizeFieldValue(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function fieldContainsToken(fieldValue: string | null, token: string): boolean {
  if (!fieldValue) return false;
  return normalizeFieldValue(fieldValue).includes(normalizeFieldValue(token));
}

export class OwnershipVerificationService {
  private resolveAdapter(provider: string) {
    return platformRegistry.getProvider(provider);
  }

  /**
   * Validates the handle exists and, when the provider supports it, returns the
   * token the student must place in their public profile field.
   */
  async startChallenge(
    studentId: string,
    provider: string,
    username: string,
  ): Promise<OwnershipChallengeSpec> {
    const adapter = this.resolveAdapter(provider);
    const providerId = provider.toUpperCase() as ProviderId;

    if (!adapter) {
      return {
        supported: false,
        provider: providerId,
        username,
        reason: `No external provider adapter registered for ${provider}.`,
      };
    }

    const capabilities = adapter.getProviderCapabilities();
    if (capabilities.ownership !== 'PROFILE_CHALLENGE' || typeof adapter.fetchPublicOwnershipField !== 'function') {
      return {
        supported: false,
        provider: providerId,
        username,
        reason:
          capabilities.ownership === 'NONE'
            ? `${provider} exposes no public editable profile field, so account ownership cannot be proven.`
            : `${provider} does not support a credential-free ownership challenge.`,
      };
    }

    const profile = await adapter.validateProfile(username);
    if (!profile.ok) {
      return {
        supported: false,
        provider: providerId,
        username,
        reason: `Profile lookup failed (${profile.errorKind}): ${profile.error}`,
      };
    }

    const token = buildChallengeToken(studentId, providerId, profile.data.externalAccountId);
    if (!token) {
      return {
        supported: false,
        provider: providerId,
        username,
        reason: 'Ownership challenge secret is not configured on the server.',
      };
    }

    // Read the current field value only to describe the field to the student.
    const current = await adapter.fetchPublicOwnershipField(profile.data.externalAccountId);
    const fieldLabel = current.ok ? current.data.label : 'public profile field';

    return {
      supported: true,
      provider: providerId,
      username: profile.data.externalAccountId,
      token,
      fieldLabel,
      instructions:
        `Add the code below to the ${fieldLabel} of your own ${provider} profile, save it, ` +
        `then check verification here. You may remove it afterwards. ` +
        `We never ask for your password, session cookie or API token.`,
    };
  }

  /**
   * Re-reads the public field and decides the ownership state. Persists the
   * resulting state on the existing `verified_profiles` row (no schema change).
   */
  async verifyOwnership(
    studentId: string,
    provider: string,
    username: string,
  ): Promise<OwnershipVerificationOutcome> {
    const adapter = this.resolveAdapter(provider);
    const providerId = provider.toUpperCase() as ProviderId;
    const checkedAt = new Date().toISOString();

    if (!adapter || typeof adapter.fetchPublicOwnershipField !== 'function') {
      return {
        provider: providerId,
        username,
        status: 'PROFILE_EXISTS',
        ownershipProven: false,
        method: OWNERSHIP_PROOF_METHOD,
        checkedAt,
        detail: `${provider} does not support a credential-free ownership challenge.`,
      };
    }

    const profile = await adapter.validateProfile(username);
    if (!profile.ok) {
      return {
        provider: providerId,
        username,
        status: 'PROFILE_EXISTS',
        ownershipProven: false,
        method: OWNERSHIP_PROOF_METHOD,
        checkedAt,
        detail: `Profile lookup failed (${profile.errorKind}): ${profile.error}`,
      };
    }

    const handle = profile.data.externalAccountId;
    const expectedToken = buildChallengeToken(studentId, providerId, handle);
    if (!expectedToken) {
      return {
        provider: providerId,
        username: handle,
        status: 'PROFILE_EXISTS',
        ownershipProven: false,
        method: OWNERSHIP_PROOF_METHOD,
        checkedAt,
        detail: 'Ownership challenge secret is not configured on the server.',
      };
    }

    const field = await adapter.fetchPublicOwnershipField(handle);
    if (!field.ok) {
      return {
        provider: providerId,
        username: handle,
        status: 'PROFILE_EXISTS',
        ownershipProven: false,
        method: OWNERSHIP_PROOF_METHOD,
        checkedAt,
        detail: `Could not read the public profile field (${field.errorKind}): ${field.error}`,
      };
    }

    const proven = fieldContainsToken(field.data.value, expectedToken);
    const status: OwnershipStatus = proven ? 'OWNERSHIP_VERIFIED' : 'OWNERSHIP_UNVERIFIED';

    return {
      provider: providerId,
      username: handle,
      status,
      ownershipProven: proven,
      method: OWNERSHIP_PROOF_METHOD,
      fieldLabel: field.data.label,
      checkedAt,
      detail: proven
        ? `Challenge token found in ${field.data.label}.`
        : `Profile exists, but the challenge token was not found in ${field.data.label}.`,
    };
  }

  /**
   * Persists the ownership outcome on the existing VerifiedProfile row. History
   * is preserved: `publicMetadata.ownership` keeps the previous proof attempts.
   */
  async persistOutcome(
    studentId: string,
    provider: string,
    username: string,
    outcome: OwnershipVerificationOutcome,
  ) {
    const platform = provider.toUpperCase();
    const existing = await prisma.verifiedProfile.findUnique({
      where: { studentId_platform: { studentId, platform } },
    });

    const previousMeta =
      existing?.publicMetadata && typeof existing.publicMetadata === 'object'
        ? (existing.publicMetadata as Record<string, unknown>)
        : {};

    const previousHistory = Array.isArray(previousMeta.ownershipHistory)
      ? (previousMeta.ownershipHistory as unknown[])
      : [];

    const metadata = {
      ...previousMeta,
      ownership: {
        status: outcome.status,
        method: outcome.method,
        ownershipProven: outcome.ownershipProven,
        checkedAt: outcome.checkedAt,
        detail: outcome.detail,
      },
      ownershipHistory: [
        ...previousHistory.slice(-4),
        { status: outcome.status, checkedAt: outcome.checkedAt, proven: outcome.ownershipProven },
      ],
    };

    const profileUrl = platformRegistry.getAdapter(platform)?.getCanonicalUrl(username) ?? existing?.profileUrl ?? '';

    return prisma.verifiedProfile.upsert({
      where: { studentId_platform: { studentId, platform } },
      update: {
        username,
        profileUrl,
        verificationStatus: outcome.status,
        verifiedAt: outcome.ownershipProven ? new Date() : existing?.verifiedAt ?? new Date(),
        publicMetadata: metadata as any,
      },
      create: {
        studentId,
        platform,
        profileUrl,
        username,
        verificationStatus: outcome.status,
        publicMetadata: metadata as any,
      },
    });
  }

  /** Records the PROFILE_EXISTS state for a freshly connected handle. */
  async recordProfileExists(studentId: string, provider: string, username: string) {
    return this.persistOutcome(studentId, provider, username, {
      provider: provider.toUpperCase() as ProviderId,
      username,
      status: 'PROFILE_EXISTS',
      ownershipProven: false,
      method: OWNERSHIP_PROOF_METHOD,
      checkedAt: new Date().toISOString(),
      detail: 'Public profile found. Account ownership not yet proven.',
    });
  }
}

export const ownershipVerification = new OwnershipVerificationService();
