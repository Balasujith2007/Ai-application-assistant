import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function verifyHOD(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'HOD' && user.role !== 'ADMIN')) return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const hod = await verifyHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const selectedDept = searchParams.get('department');
    const selectedYear = searchParams.get('year');

    // Fetch all student profiles to derive available departments, years, and sections
    const profiles = await prisma.profile.findMany({
      where: {
        user: { role: 'STUDENT' },
      },
      select: {
        department: true,
        year: true,
        section: true,
      },
    });

    // 1. Unique Departments
    const deptSet = new Set<string>();
    profiles.forEach((p) => {
      if (p.department && p.department.trim()) {
        deptSet.add(p.department.trim());
      }
    });

    if (deptSet.size === 0) {
      deptSet.add('Artificial Intelligence & Data Science');
      deptSet.add('Computer Science & Engineering');
      deptSet.add('Information Technology');
    }

    const departments = Array.from(deptSet).sort();

    // 2. Unique Years for selected Department
    let years: number[] = [];
    if (selectedDept) {
      const yearSet = new Set<number>();
      profiles.forEach((p) => {
        if (
          p.department &&
          p.department.trim().toLowerCase() === selectedDept.trim().toLowerCase() &&
          p.year
        ) {
          yearSet.add(p.year);
        }
      });

      if (yearSet.size === 0) {
        [1, 2, 3, 4].forEach((y) => yearSet.add(y));
      }
      years = Array.from(yearSet).sort((a, b) => a - b);
    }

    // 3. Unique Sections for selected Department + Year
    let sections: string[] = [];
    if (selectedDept && selectedYear) {
      const yearNum = parseInt(selectedYear);
      const secSet = new Set<string>();
      profiles.forEach((p) => {
        if (
          p.department &&
          p.department.trim().toLowerCase() === selectedDept.trim().toLowerCase() &&
          p.year === yearNum &&
          p.section &&
          p.section.trim()
        ) {
          secSet.add(p.section.trim().toUpperCase());
        }
      });

      if (secSet.size === 0) {
        ['A', 'B'].forEach((s) => secSet.add(s));
      }
      sections = Array.from(secSet).sort();
    }

    return NextResponse.json({
      departments,
      years,
      sections,
    });
  } catch (error) {
    console.error('HOD classes error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
