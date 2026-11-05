import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { signToken } from '@/lib/serverAuth';
import { sendLoginAlertNotification } from '@/lib/email/notification.service';
import { applyRateLimit } from '@/lib/security/rateLimit';
import { validateEmail, validatePayloadSize } from '@/lib/security/validation';
import { AuthenticationError, ValidationError, handleApiError } from '@/lib/security/errorHandler';

export async function POST(req: Request) {
  // Apply rate limiting to login endpoint
  const rateLimitResult = applyRateLimit(req, 'auth');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: rateLimitResult.error },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        }
      }
    );
  }

  try {
    const body = await req.json();
    
    // Validate payload size
    const sizeCheck = validatePayloadSize(body, 1); // 1KB max for login
    if (!sizeCheck.valid) {
      throw new ValidationError(sizeCheck.error);
    }

    const { email, password } = body;

    // Validate email
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      throw new AuthenticationError('Invalid credentials');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      throw new AuthenticationError('Invalid credentials');
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });

    const { password: _, ...userWithoutPassword } = user;

    // Send async login alert without blocking response
    const userAgent = req.headers.get('user-agent') || undefined;
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    sendLoginAlertNotification({
      userId: user.id,
      userAgent,
      ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        token: token,
        user: userWithoutPassword,
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
