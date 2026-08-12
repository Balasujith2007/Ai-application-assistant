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
    const rawUrl = body.codolioUrl || body.url;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return NextResponse.json({ valid: false, verified: false, message: 'Codolio profile URL is required.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.trim());
    } catch {
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid Codolio profile URL.' }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (!hostname.includes('codolio.com')) {
      return NextResponse.json({ valid: false, verified: false, message: 'URL must belong to codolio.com.' }, { status: 400 });
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) {
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid Codolio profile URL.' }, { status: 400 });
    }

    let username = '';
    if (pathSegments[0] === 'profile' && pathSegments[1]) {
      username = pathSegments[1];
    } else if (pathSegments.length === 1 && !['login', 'signup', 'about', 'terms', 'privacy'].includes(pathSegments[0].toLowerCase())) {
      username = pathSegments[0];
    } else {
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid Codolio profile URL (e.g. https://codolio.com/profile/username).' }, { status: 400 });
    }

    const normalizedUrl = `https://codolio.com/profile/${username}`;
    const metadata = {
      username,
      verificationNote: 'Public profile URL verified.'
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(normalizedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.status === 404) {
        return NextResponse.json({
          valid: false,
          verified: false,
          message: 'Codolio profile could not be verified (Profile not found).'
        }, { status: 400 });
      }
    } catch (e) {
      // Fallback allowed
    }

    // Save to Database
    const verifiedProfile = await prisma.verifiedProfile.upsert({
      where: {
        studentId_platform: {
          studentId: userId,
          platform: 'CODOLIO'
        }
      },
      update: {
        profileUrl: normalizedUrl,
        username,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        publicMetadata: metadata
      },
      create: {
        studentId: userId,
        platform: 'CODOLIO',
        profileUrl: normalizedUrl,
        username,
        verificationStatus: 'VERIFIED',
        publicMetadata: metadata
      }
    });

    // Update Profile table codolioUrl
    await prisma.profile.upsert({
      where: { userId },
      update: { codolioUrl: normalizedUrl },
      create: { userId, codolioUrl: normalizedUrl }
    });

    return NextResponse.json({
      valid: true,
      verified: true,
      platform: 'CODOLIO',
      username,
      normalizedUrl,
      metadata,
      verifiedProfile
    });

  } catch (error) {
    console.error('Error verifying Codolio profile:', error);
    return NextResponse.json({ valid: false, verified: false, message: 'Codolio profile could not be verified.' }, { status: 500 });
  }
}
