import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import net from 'net';

function isPrivateIP(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[254] === 254) return true;
    if (parts[0] === 0) return true;
  }
  return false;
}

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
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid GitHub profile URL.' }, { status: 400 });
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
      return NextResponse.json({ valid: false, verified: false, message: 'Please enter a valid GitHub user profile URL.' }, { status: 400 });
    }

    const normalizedUrl = `https://github.com/${username}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          'User-Agent': 'AICareerPlatform-Verifier',
          'Accept': 'application/vnd.github.v3+json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.status === 200) {
        return NextResponse.json({
          valid: true,
          verified: true,
          username,
          normalizedUrl
        });
      } else if (res.status === 404) {
        return NextResponse.json({
          valid: false,
          verified: false,
          message: 'GitHub profile could not be verified (User not found).'
        }, { status: 400 });
      }
    } catch (e) {
      // Fallback check via standard HEAD/GET to HTML page if API rate limited or timed out
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const htmlRes = await fetch(normalizedUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (htmlRes.status === 200) {
        return NextResponse.json({
          valid: true,
          verified: true,
          username,
          normalizedUrl
        });
      }
    } catch {}

    return NextResponse.json({
      valid: false,
      verified: false,
      message: 'GitHub profile could not be verified.'
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ valid: false, verified: false, message: 'GitHub profile could not be verified.' }, { status: 500 });
  }
}
