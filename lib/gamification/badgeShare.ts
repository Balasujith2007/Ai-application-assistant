/**
 * Badge Sharing Helpers (client-safe)
 * -----------------------------------
 * Pure, dependency-free helpers used by the student badge gallery and the
 * public verification page. Deliberately free of Node built-ins (no `crypto`)
 * so it can be imported into client components.
 *
 * IMPORTANT: These are platform-issued achievement credentials from
 * "AI Career Platform". They are NOT external accreditations or certifications
 * and must never be described as such.
 */

export const ISSUING_ORGANIZATION = 'AI Career Platform';

/** Relative public verification path (privacy-safe, no PII in the URL). */
export function buildVerificationPath(credentialId: string): string {
  return `/verify/${encodeURIComponent(credentialId)}`;
}

/** Absolute public verification URL for LinkedIn sharing. */
export function buildVerificationUrl(credentialId: string, baseUrl?: string): string {
  const base = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  return `${base}${buildVerificationPath(credentialId)}`;
}

/**
 * Prefilled LinkedIn "Add to profile" share URL for a certification entry.
 * LinkedIn only displays platform-issued credentials; we never claim external
 * accreditation.
 */
export function buildLinkedInShareUrl(input: {
  badgeTitle: string;
  credentialId: string;
  verificationUrl: string;
  issueDate: Date;
}): string {
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: `${input.badgeTitle} — ${ISSUING_ORGANIZATION}`,
    organizationName: ISSUING_ORGANIZATION,
    certId: input.credentialId,
    certUrl: input.verificationUrl,
  });
  if (input.issueDate instanceof Date && !Number.isNaN(input.issueDate.getTime())) {
    params.set('issueYear', String(input.issueDate.getUTCFullYear()));
    params.set('issueMonth', String(input.issueDate.getUTCMonth() + 1));
  }
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
