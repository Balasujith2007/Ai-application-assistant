import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { signToken } from '@/lib/serverAuth';

interface DemoAccountConfig {
  email: string;
  name: string;
  role: Role;
  department: string;
  registerNo?: string;
  employeeId?: string;
  year?: number;
  section?: string;
}

const DEMO_ACCOUNTS: Record<string, DemoAccountConfig> = {
  STUDENT: {
    email: 'demo.student@careerai.demo',
    name: 'Demo Student',
    role: Role.STUDENT,
    department: 'Artificial Intelligence & Data Science',
    registerNo: '711524DEMO001',
    year: 3,
    section: 'A',
  },
  HOD: {
    email: 'demo.hod@careerai.demo',
    name: 'Demo HOD',
    role: Role.HOD,
    department: 'Artificial Intelligence & Data Science',
    employeeId: 'DEMO-HOD-001',
  },
  ADVISOR: {
    email: 'demo.advisor@careerai.demo',
    name: 'Demo Advisor',
    role: Role.MENTOR,
    department: 'Artificial Intelligence & Data Science',
    employeeId: 'DEMO-ADV-001',
  },
  MENTOR: {
    email: 'demo.advisor@careerai.demo',
    name: 'Demo Advisor',
    role: Role.MENTOR,
    department: 'Artificial Intelligence & Data Science',
    employeeId: 'DEMO-ADV-001',
  },
  SUPER_ADMIN: {
    email: 'demo.superadmin@careerai.demo',
    name: 'Demo Super Admin',
    role: Role.SUPER_ADMIN,
    department: 'Administration',
    employeeId: 'DEMO-SA-001',
  },
  SUPERADMIN: {
    email: 'demo.superadmin@careerai.demo',
    name: 'Demo Super Admin',
    role: Role.SUPER_ADMIN,
    department: 'Administration',
    employeeId: 'DEMO-SA-001',
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({ role: 'STUDENT' }));
    const rawRole = String(body?.role || 'STUDENT').toUpperCase().trim();
    const config = DEMO_ACCOUNTS[rawRole] || DEMO_ACCOUNTS.STUDENT;

    // Look up existing demo user
    let user = await prisma.user.findUnique({
      where: { email: config.email },
      include: { profile: true },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash('Demo@1234', 10);
      user = await prisma.user.create({
        data: {
          email: config.email,
          name: config.name,
          role: config.role,
          password: hashedPassword,
          active: true,
          profile: {
            create: {
              department: config.department,
              registerNo: config.registerNo,
              employeeId: config.employeeId,
              year: config.year,
              section: config.section,
            },
          },
        },
        include: { profile: true },
      });
    } else {
      // Ensure user is active and role matches
      if (!user.active || user.role !== config.role) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            active: true,
            role: config.role,
          },
          include: { profile: true },
        });
      }
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      data: {
        token,
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    console.error('Demo authentication error:', error);
    return NextResponse.json(
      { message: 'Internal server error during demo login' },
      { status: 500 },
    );
  }
}
