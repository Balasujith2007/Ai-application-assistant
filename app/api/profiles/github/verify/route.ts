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
    const rawUrl = body.githubUrl || body.url;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return NextResponse.json({ valid: false, verified: false, message: 'GitHub profile URL is required.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.trim());
    } catch {
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid GitHub profile URL (e.g. https://github.com/username).' }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname !== 'github.com' && hostname !== 'www.github.com') {
      return NextResponse.json({ valid: false, verified: false, message: 'URL must belong to github.com.' }, { status: 400 });
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) {
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid GitHub profile URL with a username.' }, { status: 400 });
    }

    const username = pathSegments[0];
    const reservedNames = ['features', 'topics', 'collections', 'trending', 'events', 'marketplace', 'pricing', 'login', 'signup', 'explore', 'about', 'contact', 'settings', 'orgs', 'organizations', 'security', 'team'];
    if (reservedNames.includes(username.toLowerCase()) || !/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid GitHub username.' }, { status: 400 });
    }

    const normalizedUrl = `https://github.com/${username}`;
    let metadata: Record<string, any> = { username };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          'User-Agent': 'CareerAI-Verifier',
          'Accept': 'application/vnd.github.v3+json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        metadata = {
          username: data.login,
          avatar: data.avatar_url,
          bio: data.bio,
          publicRepos: data.public_repos,
          followers: data.followers,
          following: data.following,
          name: data.name
        };
      } else if (res.status === 404) {
        return NextResponse.json({
          valid: false,
          verified: false,
          message: 'GitHub profile could not be verified (User not found).'
        }, { status: 400 });
      }
    } catch (e) {
      // Fallback check
    }

    // Save to Database
    const verifiedProfile = await prisma.verifiedProfile.upsert({
      where: {
        studentId_platform: {
          studentId: userId,
          platform: 'GITHUB'
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
        platform: 'GITHUB',
        profileUrl: normalizedUrl,
        username,
        verificationStatus: 'VERIFIED',
        publicMetadata: metadata
      }
    });

    // Update Profile table githubUrl
    await prisma.profile.upsert({
      where: { userId },
      update: { githubUrl: normalizedUrl },
      create: { userId, githubUrl: normalizedUrl }
    });

    return NextResponse.json({
      valid: true,
      verified: true,
      platform: 'GITHUB',
      username,
      normalizedUrl,
      metadata,
      verifiedProfile
    });

  } catch (error) {
    console.error('Error verifying GitHub profile:', error);
    return NextResponse.json({ valid: false, verified: false, message: 'GitHub profile could not be verified.' }, { status: 500 });
  }
}
