/**
 * Badge Credential Helpers
 * ------------------------
 * A badge credential is a platform-issued achievement record that a student can
 * share (e.g. on LinkedIn) and that any third party can verify on the public
 * verification page without accessing private data.
 *
 * IMPORTANT: These are platform-issued achievement credentials from
 * "AI Career Platform". They are NOT external accreditations or certifications
 * and must never be described as such.
 */

import crypto from 'crypto';

// Client-safe sharing/verification helpers live in `badgeShare` (no Node
// built-ins) so the student gallery can build share links in the browser.
export {
  ISSUING_ORGANIZATION,
  buildVerificationPath,
  buildVerificationUrl,
  buildLinkedInShareUrl,
} from './badgeShare';

const CREDENTIAL_PREFIX = 'ACP';

/** Deterministic, collision-resistant credential id for one student+badge. */
export function buildCredentialId(studentId: string, badgeId: string, awardedAt: Date): string {
  const digest = crypto
    .createHash('sha256')
    .update(`${studentId}:${badgeId}:${awardedAt.getTime()}`)
    .digest('hex')
    .slice(0, 10)
    .toUpperCase();
  const slug = badgeId.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 22);
  return `${CREDENTIAL_PREFIX}-${slug}-${digest}`;
}

export function isCredentialId(value: unknown): value is string {
  return typeof value === 'string' && /^ACP-[A-Z0-9-]+-[A-Z0-9]{10}$/.test(value);
}

// `buildVerificationPath`, `buildVerificationUrl`, `buildLinkedInShareUrl` and
// `ISSUING_ORGANIZATION` are re-exported from `./badgeShare` at the top of this
// module (client-safe, no Node built-ins).
