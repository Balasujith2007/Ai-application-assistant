import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { checkInService } from '@/lib/gamification/checkInService';
import { XP_CONFIG } from '@/lib/gamification/xpConfig';
import prisma from '@/lib/prisma';

// In-memory rate limiting map: key -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(key: string, limit = XP_CONFIG.CHECKIN_RATE_LIMIT_MAX, windowMs = XP_CONFIG.CHECKIN_WINDOW_MS): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    return false; // Rate limit exceeded
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return true;
}

/**
 * GET /api/check-in
 * Fetches the daily check-in status, current streak, and today's earned XP for the authenticated student.
 */
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access check-in status.' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, message: 'Student account not found or deactivated.' },
        { status: 403 }
      );
    }

    const status = await checkInService.getStudentCheckInStatus(userId);
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error fetching check-in status:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch check-in status.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/check-in
 * Submits a daily check-in for the authenticated student.
 * Derives student identity strictly from the server session.
 * Disallows client-supplied student IDs, dates, or XP amounts.
 */
export async function POST(req: Request) {
  try {
    // 1. Authoritative Server-Side Authentication
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to perform check-in.' },
        { status: 401 }
      );
    }

    // 2. Rate Limiting Protection
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitKey = `checkin_${userId}_${clientIp}`;
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { success: false, message: 'Too many check-in attempts. Please try again shortly.' },
        { status: 429 }
      );
    }

    // 3. User verification and Role check
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, message: 'Student account not found or deactivated.' },
        { status: 403 }
      );
    }

    // 4. Execute idempotent check-in on the server
    const result = await checkInService.performDailyCheckIn(userId);

    return NextResponse.json(result, { status: result.alreadyCheckedIn ? 200 : 201 });
  } catch (error: any) {
    console.error('Error performing check-in:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to complete daily check-in.' },
      { status: 500 }
    );
  }
}
