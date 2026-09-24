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
    let rawUrl = body.portfolioUrl || body.url;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return NextResponse.json({ valid: false, verified: false, message: 'Portfolio website URL is required.' }, { status: 400 });
    }

    rawUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `https://${rawUrl}`;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json({
        valid: false,
        verified: false,
        message: 'Please enter a valid website URL (e.g. https://yourname.dev).'
      }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (!hostname.includes('.') || hostname.endsWith('.')) {
      return NextResponse.json({
        valid: false,
        verified: false,
        message: 'Please enter a valid domain name.'
      }, { status: 400 });
    }

    const normalizedUrl = parsedUrl.toString();
    let isReachable = false;
    let verificationStatus = 'FORMAT_VERIFIED';
    let metadata: Record<string, any> = {
      domain: hostname,
      verificationNote: 'Format & URL syntax valid.'
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

      if (res.ok || (res.status >= 200 && res.status < 400)) {
        isReachable = true;
        verificationStatus = 'VERIFIED';
        metadata = {
          domain: hostname,
          isReachable: true,
          httpStatus: res.status,
          verificationNote: 'Portfolio website online & reachable.'
        };
      } else {
        metadata = {
          domain: hostname,
          isReachable: false,
          httpStatus: res.status,
          verificationNote: `Format valid (Server returned HTTP ${res.status}).`
        };
      }
    } catch {
      // Unreachable or blocked by CORS/Firewall, format is still valid
      metadata = {
        domain: hostname,
        isReachable: false,
        verificationNote: 'Format valid (Website reachability unconfirmed).'
      };
    }

    // Save to Database
    const verifiedProfile = await prisma.verifiedProfile.upsert({
      where: {
        studentId_platform: {
          studentId: userId,
          platform: 'PORTFOLIO'
        }
      },
      update: {
        profileUrl: normalizedUrl,
        username: hostname,
        verificationStatus,
        verifiedAt: new Date(),
        publicMetadata: metadata
      },
      create: {
        studentId: userId,
        platform: 'PORTFOLIO',
        profileUrl: normalizedUrl,
        username: hostname,
        verificationStatus,
        publicMetadata: metadata
      }
    });

    // Update Profile table portfolioUrl
    await prisma.profile.upsert({
      where: { userId },
      update: { portfolioUrl: normalizedUrl },
      create: { userId, portfolioUrl: normalizedUrl }
    });

    return NextResponse.json({
      valid: true,
      verified: true,
      platform: 'PORTFOLIO',
      normalizedUrl,
      metadata,
      verifiedProfile
    });
  } catch (error) {
    console.error('Error verifying portfolio URL:', error);
    return NextResponse.json({ valid: false, verified: false, message: 'Portfolio website could not be verified.' }, { status: 500 });
  }
}
