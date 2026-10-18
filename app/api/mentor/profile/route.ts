import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

// Helper to calculate dynamic mentor profile completion percentage and checklist
export function calculateMentorCompletion(user: any, profile: any) {
  const prefs = (profile?.careerPreferences as Record<string, any>) || {};
  let score = 0;
  const checklist: { section: string; label: string; done: boolean; weight: number }[] = [];

  // 1. Personal & Institutional Details (20%)
  const hasBasicPersonal = Boolean(
    user?.name &&
    user?.email &&
    profile?.department &&
    (prefs.designation || profile?.preferredRole)
  );
  checklist.push({
    section: 'personal',
    label: 'Designation & Department Details',
    done: hasBasicPersonal,
    weight: 20
  });
  if (hasBasicPersonal) score += 20;

  // 2. Academic Qualifications (20%)
  const hasAcademic = Boolean(
    (profile?.education && profile.education.length > 0) ||
    prefs.highestDegree ||
    prefs.specialization ||
    profile?.collegeName
  );
  checklist.push({
    section: 'academic',
    label: 'Highest Qualification & Specialization',
    done: hasAcademic,
    weight: 20
  });
  if (hasAcademic) score += 20;

  // 3. Professional Experience (15%)
  const hasExperience = Boolean(
    (profile?.experiences && profile.experiences.length > 0) ||
    prefs.teachingExperienceYears !== undefined ||
    (prefs.certifications && prefs.certifications.length > 0) ||
    (prefs.publications && prefs.publications.length > 0)
  );
  checklist.push({
    section: 'experience',
    label: 'Teaching or Industry Experience',
    done: hasExperience,
    weight: 15
  });
  if (hasExperience) score += 15;

  // 4. Mentoring Expertise & Skills (20%)
  const hasExpertise = Boolean(
    prefs.primaryExpertise ||
    (prefs.skills && prefs.skills.length > 0) ||
    (profile?.skills && profile.skills.length > 0) ||
    (prefs.guidanceAreas && prefs.guidanceAreas.length > 0)
  );
  checklist.push({
    section: 'expertise',
    label: 'Mentoring Expertise & Guidance Areas',
    done: hasExpertise,
    weight: 20
  });
  if (hasExpertise) score += 20;

  // 5. Availability & Communication (15%)
  const hasAvailability = Boolean(
    prefs.mentoringMode ||
    (prefs.availableDays && prefs.availableDays.length > 0) ||
    prefs.availableTimeSlots ||
    prefs.communicationChannel
  );
  checklist.push({
    section: 'availability',
    label: 'Mentoring Availability & Preferred Mode',
    done: hasAvailability,
    weight: 15
  });
  if (hasAvailability) score += 15;

  // 6. Faculty Statement / Bio (10%)
  const hasBio = Boolean(profile?.careerObjective && profile.careerObjective.trim().length > 10);
  checklist.push({
    section: 'bio',
    label: 'Faculty Mentoring Statement / Bio',
    done: hasBio,
    weight: 10
  });
  if (hasBio) score += 10;

  return {
    score: Math.min(100, Math.max(0, score)),
    checklist,
    isComplete: score >= 90
  };
}

// GET: Fetch authenticated mentor's full faculty profile
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Role check: Allow MENTOR, HOD, and ADMIN roles
    if (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: 'Forbidden: Faculty Mentor access required' },
        { status: 403 }
      );
    }

    // Fetch or initialize profile
    let profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        education: { orderBy: { startYear: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        skills: { include: { skill: true } },
      }
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId,
          department: 'Computer Science Engineering',
          college: 'KIT - Kalaignarkarunanidhi Institute of Technology'
        },
        include: {
          education: true,
          experiences: true,
          skills: { include: { skill: true } }
        }
      });
    }

    // Fetch verified third-party records if any
    const verifiedProfiles = await prisma.verifiedProfile.findMany({
      where: { studentId: userId }
    });

    // Query official assigned students from DB
    const assignedStudents = await prisma.user.findMany({
      where: { mentorId: userId, role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        profile: {
          select: {
            registerNo: true,
            department: true,
            year: true,
            section: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const studentDepartments = [...new Set(assignedStudents.map(s => s.profile?.department).filter(Boolean))] as string[];
    const studentYears = [...new Set(assignedStudents.map(s => s.profile?.year).filter(Boolean))] as number[];
    const studentSections = [...new Set(assignedStudents.map(s => s.profile?.section).filter(Boolean))] as string[];

    const assignedStudentsSummary = {
      totalAssigned: assignedStudents.length,
      departments: studentDepartments.length > 0 ? studentDepartments : [profile.department || 'Not Assigned'],
      years: studentYears.sort((a, b) => a - b),
      sections: studentSections.sort(),
      previewRoster: assignedStudents.slice(0, 8).map(s => ({
        id: s.id,
        name: s.name,
        registerNo: s.profile?.registerNo || '—',
        department: s.profile?.department || '—',
        year: s.profile?.year ? `Year ${s.profile.year}` : '—',
        section: s.profile?.section || '—'
      }))
    };

    const completion = calculateMentorCompletion(user, profile);

    return NextResponse.json({
      success: true,
      data: {
        user,
        profile,
        assignedStudentsSummary,
        completion,
        verifiedProfiles
      }
    });
  } catch (error: any) {
    console.error('Error fetching mentor profile:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to fetch mentor profile' },
      { status: 500 }
    );
  }
}

// PUT: Update authenticated mentor's permitted profile fields
export async function PUT(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: 'Forbidden: Faculty Mentor access required' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // 1. Sanitize & Update User Name if modified
    if (typeof body.name === 'string' && body.name.trim().length > 0 && body.name.trim() !== user.name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: body.name.trim() }
      });
    }

    // 2. Fetch existing profile for merging
    const existingProfile = await prisma.profile.findUnique({
      where: { userId }
    });

    const currentPreferences = (existingProfile?.careerPreferences as Record<string, any>) || {};

    // 3. Extract & Validate Faculty Preferences
    const updatedPreferences: Record<string, any> = {
      ...currentPreferences,
      designation: typeof body.designation === 'string' ? body.designation.trim() : (currentPreferences.designation || 'Assistant Professor'),
      highestDegree: typeof body.highestDegree === 'string' ? body.highestDegree.trim() : currentPreferences.highestDegree,
      specialization: typeof body.specialization === 'string' ? body.specialization.trim() : currentPreferences.specialization,
      institutionName: typeof body.institutionName === 'string' ? body.institutionName.trim() : currentPreferences.institutionName,
      teachingExperienceYears: body.teachingExperienceYears !== undefined ? String(body.teachingExperienceYears).trim() : currentPreferences.teachingExperienceYears,
      industryExperienceYears: body.industryExperienceYears !== undefined ? String(body.industryExperienceYears).trim() : currentPreferences.industryExperienceYears,
      primaryExpertise: typeof body.primaryExpertise === 'string' ? body.primaryExpertise.trim() : currentPreferences.primaryExpertise,
      guidanceAreas: Array.isArray(body.guidanceAreas) ? body.guidanceAreas.filter((a: any) => typeof a === 'string') : (currentPreferences.guidanceAreas || []),
      skills: Array.isArray(body.skills) ? body.skills : (currentPreferences.skills || []),
      certifications: Array.isArray(body.certifications) ? body.certifications : (currentPreferences.certifications || []),
      publications: Array.isArray(body.publications) ? body.publications : (currentPreferences.publications || []),
      mentoringMode: ['ONLINE', 'OFFLINE', 'BOTH'].includes(body.mentoringMode) ? body.mentoringMode : (currentPreferences.mentoringMode || 'BOTH'),
      availableDays: Array.isArray(body.availableDays) ? body.availableDays : (currentPreferences.availableDays || ['Monday', 'Wednesday', 'Friday']),
      availableTimeSlots: typeof body.availableTimeSlots === 'string' ? body.availableTimeSlots.trim() : (currentPreferences.availableTimeSlots || '03:30 PM - 05:00 PM'),
      communicationChannel: typeof body.communicationChannel === 'string' ? body.communicationChannel.trim() : (currentPreferences.communicationChannel || 'In-Person Office Hours & Teams'),
      isAvailableForMentoring: typeof body.isAvailableForMentoring === 'boolean' ? body.isAvailableForMentoring : (currentPreferences.isAvailableForMentoring ?? true),
      unavailabilityNote: typeof body.unavailabilityNote === 'string' ? body.unavailabilityNote.trim() : (currentPreferences.unavailabilityNote || ''),
      // Retain existing institutional verification status — mentors CANNOT self-verify
      institutionalVerificationStatus: currentPreferences.institutionalVerificationStatus || (existingProfile?.employeeId ? 'VERIFIED' : 'PENDING'),
    };

    // 4. Extract standard Profile model fields
    const validProfileUpdates: Record<string, any> = {
      phone: typeof body.phone === 'string' ? body.phone.trim() : undefined,
      department: typeof body.department === 'string' ? body.department.trim() : undefined,
      college: typeof body.college === 'string' ? body.college.trim() : undefined,
      collegeName: typeof body.collegeName === 'string' ? body.collegeName.trim() : (typeof body.college === 'string' ? body.college.trim() : undefined),
      location: typeof body.location === 'string' ? body.location.trim() : undefined,
      careerObjective: typeof body.careerObjective === 'string' ? body.careerObjective.trim() : undefined,
      linkedinUrl: typeof body.linkedinUrl === 'string' ? body.linkedinUrl.trim() : undefined,
      githubUrl: typeof body.githubUrl === 'string' ? body.githubUrl.trim() : undefined,
      portfolioUrl: typeof body.portfolioUrl === 'string' ? body.portfolioUrl.trim() : undefined,
      careerPreferences: updatedPreferences,
    };

    // Employee ID: Allow initial set if not present, otherwise preserve existing to prevent tampering
    if (!existingProfile?.employeeId && typeof body.employeeId === 'string' && body.employeeId.trim()) {
      validProfileUpdates.employeeId = body.employeeId.trim();
    }

    // Clean undefined values
    Object.keys(validProfileUpdates).forEach(k => {
      if (validProfileUpdates[k] === undefined) {
        delete validProfileUpdates[k];
      }
    });

    // 5. Upsert Profile
    const updatedProfile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        ...validProfileUpdates,
        careerPreferences: updatedPreferences,
      },
      update: validProfileUpdates,
      include: {
        education: { orderBy: { startYear: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        skills: { include: { skill: true } },
      }
    });

    // 6. Handle optional structured Education items if sent
    if (Array.isArray(body.educationList)) {
      // Clear and re-populate custom education for this mentor
      await prisma.education.deleteMany({ where: { profileId: updatedProfile.id } });
      for (const edu of body.educationList) {
        if (edu.institution && edu.degree && edu.startYear) {
          await prisma.education.create({
            data: {
              profileId: updatedProfile.id,
              institution: String(edu.institution).trim(),
              degree: String(edu.degree).trim(),
              fieldOfStudy: edu.fieldOfStudy ? String(edu.fieldOfStudy).trim() : null,
              startYear: Number(edu.startYear) || new Date().getFullYear(),
              endYear: edu.endYear ? Number(edu.endYear) : null,
              grade: edu.grade ? String(edu.grade).trim() : null,
            }
          });
        }
      }
    }

    // 7. Handle optional structured Experience items if sent
    if (Array.isArray(body.experienceList)) {
      await prisma.experience.deleteMany({ where: { profileId: updatedProfile.id } });
      for (const exp of body.experienceList) {
        if (exp.company && exp.role) {
          const startDate = exp.startDate ? new Date(exp.startDate) : new Date();
          const endDate = exp.endDate ? new Date(exp.endDate) : null;
          await prisma.experience.create({
            data: {
              profileId: updatedProfile.id,
              company: String(exp.company).trim(),
              role: String(exp.role).trim(),
              description: exp.description ? String(exp.description).trim() : null,
              startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
              endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
              currentlyWorking: Boolean(exp.currentlyWorking),
              duration: exp.duration ? String(exp.duration).trim() : null,
            }
          });
        }
      }
    }

    // Refetch complete refreshed profile with relations
    const finalProfile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        education: { orderBy: { startYear: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        skills: { include: { skill: true } },
      }
    });

    const completion = calculateMentorCompletion(user, finalProfile);

    return NextResponse.json({
      success: true,
      message: 'Faculty profile updated successfully',
      data: {
        profile: finalProfile,
        completion
      }
    });
  } catch (error: any) {
    console.error('Error updating mentor profile:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to update faculty profile' },
      { status: 500 }
    );
  }
}
