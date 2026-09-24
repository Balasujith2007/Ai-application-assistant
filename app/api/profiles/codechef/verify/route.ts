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
    const rawUrl = body.codechefUrl || body.url;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return NextResponse.json({ valid: false, verified: false, message: 'CodeChef profile URL is required.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.trim());
    } catch {
      return NextResponse.json({
        valid: false,
        verified: false,
        message: 'Please enter a valid CodeChef profile URL (e.g. https://www.codechef.com/users/username).'
      }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname !== 'codechef.com' && hostname !== 'www.codechef.com') {
      return NextResponse.json({ valid: false, verified: false, message: 'URL must belong to codechef.com.' }, { status: 400 });
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) {
      return NextResponse.json({
        valid: false,
        verified: false,
        message: 'Please enter a valid CodeChef profile URL (e.g. https://www.codechef.com/users/username).'
      }, { status: 400 });
    }

    let username = '';
    if (pathSegments[0] === 'users' && pathSegments[1]) {
      username = pathSegments[1];
    } else if (pathSegments.length === 1 && !['login', 'signup', 'ratings', 'ide', 'practice', 'contests', 'discuss'].includes(pathSegments[0].toLowerCase())) {
      username = pathSegments[0];
    } else {
      return NextResponse.json({
        valid: false,
        verified: false,
        message: 'Please enter a valid CodeChef profile URL (e.g. https://www.codechef.com/users/username).'
      }, { status: 400 });
    }

    // Clean username (alphanumeric and underscores)
    if (!/^[a-zA-Z0-9_]{2,50}$/.test(username)) {
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid CodeChef username.' }, { status: 400 });
    }

    const normalizedUrl = `https://www.codechef.com/users/${username}`;
    let verificationStatus = 'VERIFIED';
    let metadata: Record<string, any> = {
      username,
      verificationNote: 'CodeChef profile verified.'
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(normalizedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.status === 404) {
        return NextResponse.json({
          valid: false,
          verified: false,
          message: 'CodeChef profile could not be verified (User not found).'
        }, { status: 400 });
      }

      if (res.ok) {
        metadata = {
          username,
          verificationNote: 'Public profile verified on CodeChef.'
        };
      } else {
        verificationStatus = 'FORMAT_VERIFIED';
      }
    } catch {
      // Network/fallback mode
      verificationStatus = 'FORMAT_VERIFIED';
      metadata = {
        username,
        verificationNote: 'Format & URL syntax verified.'
      };
    }

    // Save to Database
    const verifiedProfile = await prisma.verifiedProfile.upsert({
      where: {
        studentId_platform: {
          studentId: userId,
          platform: 'CODECHEF'
        }
      },
      update: {
        profileUrl: normalizedUrl,
        username,
        verificationStatus,
        verifiedAt: new Date(),
        publicMetadata: metadata
      },
      create: {
        studentId: userId,
        platform: 'CODECHEF',
        profileUrl: normalizedUrl,
        username,
        verificationStatus,
        publicMetadata: metadata
      }
    });

    // Update Profile table codechefUrl
    await prisma.profile.upsert({
      where: { userId },
      update: { codechefUrl: normalizedUrl },
      create: { userId, codechefUrl: normalizedUrl }
    });

    return NextResponse.json({
      valid: true,
      verified: true,
      platform: 'CODECHEF',
      username,
      normalizedUrl,
      metadata,
      verifiedProfile
    });
  } catch (error) {
    console.error('Error verifying CodeChef profile:', error);
    return NextResponse.json({ valid: false, verified: false, message: 'CodeChef profile could not be verified.' }, { status: 500 });
  }
}
