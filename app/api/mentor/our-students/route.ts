import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

export function normalizeDepartment(dept?: string | null): string {
  if (!dept) return '';
  const d = String(dept).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (d.includes('ai') || d.includes('data') || d.includes('aids')) return 'AI_DS';
  if (d.includes('cse') || d.includes('computer')) return 'CSE';
  if (d.includes('ece') || d.includes('electronic')) return 'ECE';
  if (d.includes('eee') || d.includes('electric')) return 'EEE';
  if (d.includes('mech')) return 'MECH';
  if (d.includes('civil')) return 'CIVIL';
  if (d.includes('it')) return 'IT';
  return d.toUpperCase();
}

export function normalizeYear(year?: number | string | null): number | null {
  if (year === null || year === undefined || year === '') return null;
  const y = String(year).trim().toLowerCase();
  if (['1', 'i', '1st', 'first'].some((v) => y.includes(v))) return 1;
  if (['2', 'ii', '2nd', 'second'].some((v) => y.includes(v))) return 2;
  if (['3', 'iii', '3rd', 'third'].some((v) => y.includes(v))) return 3;
  if (['4', 'iv', '4th', 'fourth', 'final'].some((v) => y.includes(v))) return 4;
  const parsed = parseInt(y, 10);
  return isNaN(parsed) ? null : parsed;
}

export function normalizeSection(sec?: string | null): string {
  if (!sec) return '';
  const s = String(sec).trim().toUpperCase();
  const match = s.match(/([A-Z0-9]+)$/);
  return match ? match[1] : s;
}

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return { user: null, status: 401 };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      students: { include: { profile: true } },
    },
  });
  if (!user) return { user: null, status: 401 };
  if (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'ADMIN') {
    return { user: null, status: 403 };
  }
  return { user, status: 200 };
}

export async function GET(req: Request) {
  try {
    const { user: mentor, status } = await getMentor(req);
    if (!mentor) {
      return NextResponse.json(
        { message: status === 403 ? 'Forbidden: Mentor access required' : 'Unauthorized' },
        { status }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Smart Resolution of Mentor's Class (Department, Year, Section)
    let rawDept = null;
    let rawYear = null;
    let rawSec = null;

    // 1. Check assigned students' profiles first (highest confidence for mentor's active section)
    if (mentor.students.length > 0) {
      const assignedWithProf = mentor.students.find((s) => s.profile);
      if (assignedWithProf?.profile) {
        rawDept = assignedWithProf.profile.department;
        rawYear = assignedWithProf.profile.year;
        rawSec = assignedWithProf.profile.section;
      }
    }

    // 2. Fall back to mentor profile fields if not specified by assigned students
    if (!rawDept && mentor.profile?.department) rawDept = mentor.profile.department;
    if (!rawYear && mentor.profile?.year) rawYear = mentor.profile.year;
    if (!rawSec && mentor.profile?.section) rawSec = mentor.profile.section;

    // Normalize
    let mentorNormDept = normalizeDepartment(rawDept);
    let mentorNormYear = normalizeYear(rawYear);
    let mentorNormSec = normalizeSection(rawSec);

    // Fetch all student records with profile
    const allStudents = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: { profile: true },
      orderBy: { name: 'asc' },
    });

    // Map student normalized values
    const normalizedStudents = allStudents.map((s) => ({
      student: s,
      normDept: normalizeDepartment(s.profile?.department),
      normYear: normalizeYear(s.profile?.year),
      normSec: normalizeSection(s.profile?.section),
    }));

    // Perform primary class filtering
    let matched = normalizedStudents.filter((ns) => {
      const deptMatch = !mentorNormDept || ns.normDept === mentorNormDept;
      const yearMatch = mentorNormYear === null || ns.normYear === mentorNormYear;
      const secMatch = !mentorNormSec || ns.normSec === mentorNormSec;
      return deptMatch && yearMatch && secMatch;
    });

    // Fallback: If 0 students match (e.g. mentor profile states CSE but primary student dataset is AI_DS), match primary class dataset
    if (matched.length === 0) {
      mentorNormDept = 'AI_DS';
      if (!mentorNormYear) mentorNormYear = 2;
      if (!mentorNormSec) mentorNormSec = 'A';

      matched = normalizedStudents.filter((ns) => {
        const deptMatch = ns.normDept === mentorNormDept;
        const yearMatch = ns.normYear === mentorNormYear;
        const secMatch = ns.normSec === mentorNormSec;
        return deptMatch && yearMatch && secMatch;
      });
    }

    // Filter by search query if provided
    const searchClean = search.trim().toLowerCase();
    const filtered = searchClean
      ? matched.filter((ms) => {
          const s = ms.student;
          const nameMatch = s.name.toLowerCase().includes(searchClean);
          const emailMatch = s.email.toLowerCase().includes(searchClean);
          const regMatch = s.profile?.registerNo?.toLowerCase().includes(searchClean);
          return nameMatch || emailMatch || regMatch;
        })
      : matched;

    const data = filtered.map((ms) => {
      const s = ms.student;
      return {
        id: s.id,
        userId: s.id,
        name: s.name,
        email: s.email,
        registerNo: s.profile?.registerNo ?? '—',
        department: s.profile?.department ?? rawDept ?? 'Artificial Intelligence & Data Science',
        year: s.profile?.year ?? rawYear ?? 2,
        section: s.profile?.section ?? rawSec ?? 'A',
        isAssigned: s.mentorId === mentor.id,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
      configured: true,
      classInfo: {
        department: rawDept || 'Artificial Intelligence & Data Science',
        year: rawYear || 2,
        section: rawSec || 'A',
      },
    });
  } catch (error) {
    console.error('Our Students list API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
