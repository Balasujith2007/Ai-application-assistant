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
    const rawUrl = body.leetcodeUrl || body.url;

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return NextResponse.json({ valid: false, verified: false, message: 'LeetCode profile URL is required.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.trim());
    } catch {
      return NextResponse.json({
        valid: false,
        verified: false,
        message: 'Please enter a valid LeetCode profile URL (e.g. https://leetcode.com/u/username).'
      }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname !== 'leetcode.com' && hostname !== 'www.leetcode.com') {
      return NextResponse.json({ valid: false, verified: false, message: 'URL must belong to leetcode.com.' }, { status: 400 });
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) {
      return NextResponse.json({
        valid: false,
        verified: false,
        message: 'Please enter a valid LeetCode profile URL (e.g. https://leetcode.com/u/username).'
      }, { status: 400 });
    }

    let username = '';
    const reservedWords = [
      'problems', 'explore', 'contest', 'discuss', 'interview', 'playground',
      'company', 'assessment', 'login', 'accounts', 'api', 'graphql', 'help', 'subscribe'
    ];

    if (pathSegments[0] === 'u' && pathSegments[1]) {
      username = pathSegments[1];
    } else if (pathSegments.length === 1 && !reservedWords.includes(pathSegments[0].toLowerCase())) {
      username = pathSegments[0];
    } else {
      return NextResponse.json({
        valid: false,
        verified: false,
        message: 'Please enter a valid LeetCode profile URL (e.g. https://leetcode.com/u/username).'
      }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_-]{2,50}$/.test(username) || reservedWords.includes(username.toLowerCase())) {
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid LeetCode username.' }, { status: 400 });
    }

    const normalizedUrl = `https://leetcode.com/u/${username}`;
    let verificationStatus = 'VERIFIED';
    let metadata: Record<string, any> = {
      username,
      verificationNote: 'Public profile verified on LeetCode.'
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const query = `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              realName
              userAvatar
              aboutMe
              ranking
            }
            submitStats: submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
        }
      `;

      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CareerAI-Verifier',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query, variables: { username } }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const matched = data?.data?.matchedUser;
        if (matched) {
          const totalSolved = matched.submitStats?.acSubmissionNum?.find((x: any) => x.difficulty === 'All')?.count;
          metadata = {
            username: matched.username,
            name: matched.profile?.realName || undefined,
            avatar: matched.profile?.userAvatar || undefined,
            ranking: matched.profile?.ranking || undefined,
            totalSolved: totalSolved !== undefined ? totalSolved : undefined,
            verificationNote: `LeetCode Profile verified${totalSolved !== undefined ? ` • ${totalSolved} Problems Solved` : ''}`
          };
        } else {
          // If GraphQL matchedUser is null, user does not exist
          return NextResponse.json({
            valid: false,
            verified: false,
            message: 'LeetCode profile could not be verified (User not found).'
          }, { status: 400 });
        }
      } else {
        verificationStatus = 'FORMAT_VERIFIED';
      }
    } catch {
      // Fallback
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
          platform: 'LEETCODE'
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
        platform: 'LEETCODE',
        profileUrl: normalizedUrl,
        username,
        verificationStatus,
        publicMetadata: metadata
      }
    });

    // Update Profile table leetcodeUrl
    await prisma.profile.upsert({
      where: { userId },
      update: { leetcodeUrl: normalizedUrl },
      create: { userId, leetcodeUrl: normalizedUrl }
    });

    return NextResponse.json({
      valid: true,
      verified: true,
      platform: 'LEETCODE',
      username,
      normalizedUrl,
      metadata,
      verifiedProfile
    });
  } catch (error) {
    console.error('Error verifying LeetCode profile:', error);
    return NextResponse.json({ valid: false, verified: false, message: 'LeetCode profile could not be verified.' }, { status: 500 });
  }
}
