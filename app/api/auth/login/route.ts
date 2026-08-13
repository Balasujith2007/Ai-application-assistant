import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { signToken } from '@/lib/serverAuth';
import { sendLoginAlertNotification } from '@/lib/email/notification.service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
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
      data: {
        token: token,
        user: userWithoutPassword,
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
