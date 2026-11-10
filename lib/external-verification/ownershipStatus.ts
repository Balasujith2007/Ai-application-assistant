/**
 * Account-ownership state model (Phase 1, Step 4).
 *
 * Profile existence is NOT account ownership. Previously every successful
 * profile lookup was persisted as `VERIFIED`, which conflated "this public
 * profile exists" with "this student controls that account". These states make
 * the distinction explicit and are persisted in the existing
 * `verified_profiles.verificationStatus` column (no schema change required).
 */

export type OwnershipStatus =
  /** A public profile was found. Control of the account is NOT established. */
  | 'PROFILE_EXISTS'
  /** A profile was found and an ownership challenge was attempted but not satisfied. */
  | 'OWNERSHIP_UNVERIFIED'
  /** The student proved control of the account via the provider-supported challenge. */
  | 'OWNERSHIP_VERIFIED';

/** Legacy values written before the ownership model existed. */
const LEGACY_STATUS_MAP: Record<string, OwnershipStatus> = {
  VERIFIED: 'PROFILE_EXISTS',
  FORMAT_VERIFIED: 'PROFILE_EXISTS',
  PENDING: 'PROFILE_EXISTS',
  UNVERIFIED: 'PROFILE_EXISTS',
  PROFILE_EXISTS: 'PROFILE_EXISTS',
  OWNERSHIP_UNVERIFIED: 'OWNERSHIP_UNVERIFIED',
  OWNERSHIP_VERIFIED: 'OWNERSHIP_VERIFIED',
};

/**
 * Maps any persisted `verificationStatus` (including legacy values) onto the
 * canonical ownership model. Unknown values are treated conservatively as
 * `PROFILE_EXISTS` — never as verified.
 */
export function normalizeOwnershipStatus(raw: string | null | undefined): OwnershipStatus {
  if (!raw) return 'PROFILE_EXISTS';
  return LEGACY_STATUS_MAP[raw.toUpperCase()] ?? 'PROFILE_EXISTS';
}

/**
 * Ownership-gated badge policy.
 *
 * High-value external-achievement badges may only be awarded from an account
 * whose ownership is proven. Non-high-value / derived badges are unaffected.
 */
export interface ExternalBadgeEligibility {
  eligible: boolean;
  status: OwnershipStatus;
  reason: string;
}

/**
 * Decides whether a verified external account may back a high-value external
 * achievement badge. Callers MUST gate external-achievement awards through this
 * function rather than checking profile existence directly.
 */
export function isEligibleForExternalAchievementBadge(
  rawStatus: string | null | undefined,
): ExternalBadgeEligibility {
  const status = normalizeOwnershipStatus(rawStatus);
  if (status === 'OWNERSHIP_VERIFIED') {
    return { eligible: true, status, reason: 'Account ownership verified.' };
  }
  if (status === 'OWNERSHIP_UNVERIFIED') {
    return {
      eligible: false,
      status,
      reason: 'Ownership challenge attempted but not satisfied. Badge not eligible.',
    };
  }
  return {
    eligible: false,
    status,
    reason: 'Profile existence confirmed but account ownership is not proven. Badge not eligible.',
  };
}
