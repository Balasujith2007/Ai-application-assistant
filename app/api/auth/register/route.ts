import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { signToken } from '@/lib/serverAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role = 'STUDENT', department, employeeId } = body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        profile: {
          create: {
            department: department || undefined,
            employeeId: employeeId || undefined,
          } as any
        }
      },
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });

    const { password: _, ...userWithoutPassword } = user;
    
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
