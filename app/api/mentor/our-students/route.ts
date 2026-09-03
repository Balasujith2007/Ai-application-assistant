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

const CLASS_STUDENT_REGISTER_NUMBERS = [
  '711524BAD008', '711524BAD010', '711524BAD013', '711524BAD015', '711524BAD016',
  '711524BAD017', '711524BAD019', '711524BAD026', '711524BAD023', '711524BAD032',
  '711524BAD033', '711524BAD038', '711524BAD042', '711524BAD043', '711524BAD045',
  '711524BAD048', '711524BAD054', '711524BAD057', '711524BAD058', '711524BAD059',
  '711524BAD065', '711524BAD066', '711524BAD071', '711524BAD072', '711524BAD074',
  '711524BAD079', '711524BAD080', '711524BAD082', '711524BAD090', '711524BAD091',
  '711524BAD092', '711524BAD093', '711524BAD095', '711524BAD097', '711524BAD103',
  '711524BAD104', '711524BAD105', '711524BAD107', '711524BAD113', '711524BAD116',
  '711524BAD115', '711524BAD118', '711524BAD123', '711524BAD126', '711524BAD128',
  '711524BAD129', '711524BAD131', '711524BAD132', '711524BAD133', '711524BAD134',
  '711524BAD139', '711524BAD140', '711524BAD150', '711524BAD151', '711524BAD153',
  '711524BAD154', '711524BAD160', '711524BAD162', '711524BAD168', '711524BAD171',
  '711524BAD176', '711524BAD188', '711524BAD189', '711524BAD306', '711524BAD308',
  '711524BAD309', '711524BAD311',
];

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
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    // Fetch all 67 class students from the database
    const classStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        profile: {
          registerNo: {
            in: CLASS_STUDENT_REGISTER_NUMBERS,
            mode: 'insensitive',
          },
        },
      },
      include: { profile: true },
      orderBy: { name: 'asc' },
    });

    // Filter by search query if provided
    const filtered = search
      ? classStudents.filter((s) => {
          const nameMatch = s.name.toLowerCase().includes(search);
          const emailMatch = s.email.toLowerCase().includes(search);
          const regMatch = (s.profile?.registerNo || '').toLowerCase().includes(search);
          return nameMatch || emailMatch || regMatch;
        })
      : classStudents;

    const data = filtered.map((s) => ({
      id: s.id,
      userId: s.id,
      name: s.name,
      email: s.email,
      registerNo: s.profile?.registerNo ?? '—',
      department: s.profile?.department ?? 'Artificial Intelligence & Data Science',
      year: s.profile?.year ?? 2,
      section: s.profile?.section ?? 'A',
      isAssigned: s.mentorId === mentor.id,
    }));

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
      configured: true,
      classInfo: {
        department: mentor.profile?.department || 'Artificial Intelligence & Data Science',
        year: mentor.profile?.year || 2,
        section: mentor.profile?.section || 'A',
      },
    });
  } catch (error) {
    console.error('Our Students list API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
