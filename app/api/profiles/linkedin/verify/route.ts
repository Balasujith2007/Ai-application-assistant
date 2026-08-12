import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ valid: false, verified: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawUrl = body.linkedinUrl || body.url;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return NextResponse.json({ valid: false, verified: false, message: 'LinkedIn profile URL is required.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.trim());
    } catch {
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username).' }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (!hostname.includes('linkedin.com')) {
      return NextResponse.json({ valid: false, verified: false, message: 'URL must belong to linkedin.com.' }, { status: 400 });
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathSegments.length < 2 || (pathSegments[0] !== 'in' && pathSegments[0] !== 'pub' && pathSegments[0] !== 'company')) {
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username).' }, { status: 400 });
    }

    const username = pathSegments[1];
    const normalizedUrl = `https://www.linkedin.com/in/${username}`;

    const metadata = {
      username,
      verificationNote: 'Format & URL syntax verified.'
    };

    // Save to Database
    const verifiedProfile = await prisma.verifiedProfile.upsert({
      where: {
        studentId_platform: {
          studentId: userId,
          platform: 'LINKEDIN'
        }
      },
      update: {
        profileUrl: normalizedUrl,
        username,
        verificationStatus: 'FORMAT_VERIFIED',
        verifiedAt: new Date(),
        publicMetadata: metadata
      },
      create: {
        studentId: userId,
        platform: 'LINKEDIN',
        profileUrl: normalizedUrl,
        username,
        verificationStatus: 'FORMAT_VERIFIED',
        publicMetadata: metadata
      }
    });

    // Update Profile table linkedinUrl
    await prisma.profile.upsert({
      where: { userId },
      update: { linkedinUrl: normalizedUrl },
      create: { userId, linkedinUrl: normalizedUrl }
    });

    return NextResponse.json({
      valid: true,
      verified: true,
      platform: 'LINKEDIN',
      username,
      normalizedUrl,
      metadata,
      verifiedProfile
    });

  } catch (error) {
    console.error('Error verifying LinkedIn profile:', error);
    return NextResponse.json({ valid: false, verified: false, message: 'LinkedIn profile could not be verified.' }, { status: 500 });
  }
}
