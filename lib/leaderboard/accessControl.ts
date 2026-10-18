import prisma from '@/lib/prisma';
import { StudentClassIdentity } from './types';

/**
 * Server-side authoritative class membership resolution
 */
export async function getAuthoritativeStudentClass(userId: string): Promise<{
  student: any;
  classIdentity: StudentClassIdentity;
}> {
  if (!userId) {
    throw new Error('User ID is required for class verification');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw new Error('Authenticated student record not found');
  }

  const profile = user.profile;
  const department = (profile?.department || '').trim();
  const year = profile?.year || 0;
  const section = (profile?.section || '').trim().toUpperCase();
  const college = (profile?.college || '').trim();

  const isComplete = Boolean(department && year && section);

  return {
    student: {
      id: user.id,
      name: user.name,
      role: user.role,
      active: user.active,
    },
    classIdentity: {
      department,
      year,
      section,
      college: college || undefined,
      isComplete,
    },
  };
}

/**
 * Builds Prisma where-clause strictly scoped to student's authorized class
 */
export function buildClassFilter(classIdentity: StudentClassIdentity): {
  department: string;
  year: number;
  section: string;
  college?: string;
} {
  if (!classIdentity.isComplete) {
    throw new Error('Student academic class profile is incomplete (missing department, year, or section).');
  }

  const filter: any = {
    department: classIdentity.department,
    year: classIdentity.year,
    section: classIdentity.section,
  };

  if (classIdentity.college) {
    filter.college = classIdentity.college;
  }

  return filter;
}

/**
 * Sanitizes a student entry to guarantee zero PII leakage
 */
export function sanitizeLeaderboardEntry<T extends Record<string, any>>(rawEntry: T): any {
  const {
    email,
    password,
    phone,
    dob,
    address,
    location,
    pinCode,
    resumes,
    applications,
    notificationPreferences,
    privacySettings,
    ...safeFields
  } = rawEntry;

  return safeFields;
}
