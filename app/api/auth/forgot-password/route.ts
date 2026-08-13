import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPasswordResetNotification } from '@/lib/email/notification.service';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: 'Email address is required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If that email address is registered, a password reset link has been sent.'
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetLink = `${baseUrl}/reset-password?email=${encodeURIComponent(user.email)}&otp=${otp}`;

    await sendPasswordResetNotification({
      email: user.email,
      recipientName: user.name,
      resetLink,
      otp,
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
