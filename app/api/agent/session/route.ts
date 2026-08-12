import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { opportunityId } = body;

    if (!opportunityId) {
      return NextResponse.json({ success: false, error: 'Opportunity ID is required.' }, { status: 400 });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found.' }, { status: 404 });
    }

    const rawRegistrationUrl = opportunity.registrationUrl || opportunity.opportunityUrl || opportunity.applyUrl || '';
    if (!rawRegistrationUrl) {
      return NextResponse.json({ success: false, error: 'Registration URL unavailable.' }, { status: 400 });
    }

    // Generate 15-minute short-lived session token
    const sessionToken = `cai_agent_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const session = await prisma.autofillSession.create({
      data: {
        studentId: userId,
        opportunityId,
        sessionToken,
        status: 'CREATED',
        expiresAt
      }
    });

    // Append session token as query param for agent detection
    const urlObj = new URL(rawRegistrationUrl);
    urlObj.searchParams.set('careerai_session_id', sessionToken);
    const autofillUrl = urlObj.toString();

    return NextResponse.json({
      success: true,
      sessionId: sessionToken,
      autofillUrl,
      rawRegistrationUrl,
      opportunityTitle: opportunity.title,
      expiresAt
    });

  } catch (error: unknown) {
    console.error('Error creating agent session:', error);
    const message = (error as Error)?.message || 'Failed to create autofill session.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
