import { NextResponse } from 'next/server';
import { badgeEngine } from '@/lib/gamification/badgeEngine';
import { buildVerificationUrl } from '@/lib/gamification/badgeCredentials';

/**
 * Public, unauthenticated credential verification.
 *
 * GET /api/credentials/[credentialId]
 *
 * Returns only non-sensitive achievement metadata (badge title, category, tier,
 * issuing organisation, issue date, masked holder name, validity status). It
 * never exposes student emails, applications, documents or internal performance
 * records.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ credentialId: string }> }) {
  const { credentialId } = await ctx.params;

  if (!credentialId || !/^ACP-[A-Z0-9-]+-[A-Z0-9]{10}$/.test(credentialId)) {
    return NextResponse.json(
      { success: false, found: false, message: 'Malformed credential id.' },
      { status: 400 }
    );
  }

  const result = await badgeEngine.verifyCredential(credentialId);
  if (!result.found || !result.credential) {
    return NextResponse.json(
      { success: false, found: false, message: 'No credential found for this id.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    found: true,
    credential: {
      ...result.credential,
      verificationUrl: buildVerificationUrl(credentialId),
    },
  });
}
