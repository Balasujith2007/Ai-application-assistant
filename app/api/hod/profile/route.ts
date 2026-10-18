import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

// Helper to compute dynamic HOD profile completion score and checklist
export function calculateHODCompletion(user: any, profile: any) {
  const prefs = (profile?.careerPreferences as Record<string, any>) || {};
  let score = 0;
  const checklist: { section: string; label: string; done: boolean; weight: number }[] = [];

  // 1. Personal & Professional Identity (20%)
  const hasIdentity = Boolean(
    user?.name &&
    user?.email &&
    profile?.department &&
    (prefs.designation || profile?.preferredRole) &&
    profile?.employeeId
  );
  checklist.push({
    section: 'identity',
    label: 'Personal & Professional Identity (Designation, Dept, ID)',
    done: hasIdentity,
    weight: 20
  });
  if (hasIdentity) score += 20;

  // 2. Academic Qualifications & Leadership (20%)
  const hasAcademic = Boolean(
    prefs.highestDegree &&
    prefs.specialization &&
    (prefs.leadershipExperienceYears !== undefined || prefs.teachingExperienceYears !== undefined)
  );
  checklist.push({
    section: 'academic',
    label: 'Academic Qualifications & Leadership Experience',
    done: hasAcademic,
    weight: 20
  });
  if (hasAcademic) score += 20;

  // 3. Department & Academic Details (15%)
  const hasDeptDetails = Boolean(
    (prefs.supportedProgrammes && prefs.supportedProgrammes.length > 0) ||
    (prefs.academicResponsibilities && prefs.academicResponsibilities.length > 0) ||
    prefs.departmentOffice
  );
  checklist.push({
    section: 'department',
    label: 'Programmes & Department Academic Responsibilities',
    done: hasDeptDetails,
    weight: 15
  });
  if (hasDeptDetails) score += 15;

  // 4. Placement & Industry Coordination (15%)
  const hasPlacement = Boolean(
    (prefs.placementResponsibilities && prefs.placementResponsibilities.length > 0) ||
    (prefs.industryCollaborations && prefs.industryCollaborations.length > 0) ||
    (prefs.recruitmentInitiatives && prefs.recruitmentInitiatives.length > 0)
  );
  checklist.push({
    section: 'placement',
    label: 'Placement Oversight & Industry Collaboration',
    done: hasPlacement,
    weight: 15
  });
  if (hasPlacement) score += 15;

  // 5. Office Hours & Availability (15%)
  const hasAvailability = Boolean(
    prefs.officeHours ||
    (prefs.availableDays && prefs.availableDays.length > 0) ||
    prefs.meetingMode ||
    prefs.communicationPreferences
  );
  checklist.push({
    section: 'availability',
    label: 'Office Hours & Meeting Consultation Preferences',
    done: hasAvailability,
    weight: 15
  });
  if (hasAvailability) score += 15;

  // 6. Leadership Statement & Professional Vision (15%)
  const hasBio = Boolean(profile?.careerObjective && profile.careerObjective.trim().length >= 15);
  checklist.push({
    section: 'vision',
    label: 'Department Leadership Vision & Academic Philosophy',
    done: hasBio,
    weight: 15
  });
  if (hasBio) score += 15;

  return {
    score: Math.min(100, Math.max(0, score)),
    checklist,
    isComplete: score >= 90
  };
}

// GET: Fetch authenticated HOD's full profile and real department snapshot
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

    // Role check: Allow HOD, ADMIN, and SUPER_ADMIN roles
    if (user.role !== 'HOD' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: 'Forbidden: Head of Department access required' },
        { status: 403 }
      );
    }

    // Fetch or initialize profile
    let profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        education: { orderBy: { startYear: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
      }
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId,
          department: 'Artificial Intelligence & Data Science',
          college: 'KIT - Kalaignarkarunanidhi Institute of Technology'
        },
        include: {
          education: true,
          experiences: true,
        }
      });
    }

    // Fetch verified third-party records if any
    const verifiedProfiles = await prisma.verifiedProfile.findMany({
      where: { studentId: userId }
    });

    // Real department snapshot data scoped to HOD's department
    const hodDept = profile.department || 'Artificial Intelligence & Data Science';

    // 1. Department Student Count
    const departmentStudentsCount = await prisma.user.count({
      where: {
        role: 'STUDENT',
        OR: [
          { profile: { department: { contains: hodDept, mode: 'insensitive' } } },
          { profile: { department: { in: ['Artificial Intelligence & Data Science', 'Ai&ds', 'ai&ds', 'AI&DS'] } } }
        ]
      }
    });

    // 2. Department Mentors / Faculty Count
    const departmentMentorsCount = await prisma.user.count({
      where: { role: 'MENTOR' }
    });

    // 3. Active Opportunities Count (Placements, Internships, Hackathons)
    const activeOpportunitiesCount = await prisma.opportunity.count({
      where: {
        status: { in: ['PUBLISHED', 'REGISTRATION_OPEN', 'IN_PROGRESS'] }
      }
    });

    // 4. Placement Drives / Active Registrations Count
    const placementRegistrationsCount = await prisma.opportunityRegistration.count({
      where: {
        status: { in: ['REGISTERED', 'VERIFIED', 'SELECTED'] }
      }
    });

    // 5. Total Registered Students Count
    const totalSelectedStudents = await prisma.opportunityRegistration.count({
      where: { status: 'SELECTED' }
    });

    const departmentSnapshot = {
      departmentName: hodDept,
      totalStudents: departmentStudentsCount,
      totalMentors: departmentMentorsCount,
      activeOpportunities: activeOpportunitiesCount,
      placementRegistrations: placementRegistrationsCount,
      placedStudents: totalSelectedStudents,
      lastAuditSync: new Date().toISOString()
    };

    const completion = calculateHODCompletion(user, profile);

    return NextResponse.json({
      success: true,
      data: {
        user,
        profile,
        departmentSnapshot,
        completion,
        verifiedProfiles
      }
    });
  } catch (error: any) {
    console.error('Error fetching HOD profile:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to fetch HOD profile' },
      { status: 500 }
    );
  }
}

// PUT: Update authenticated HOD's permitted profile fields
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

    if (user.role !== 'HOD' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: 'Forbidden: Head of Department access required' },
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

    // 3. Extract & Validate HOD Leadership Preferences
    const updatedPreferences: Record<string, any> = {
      ...currentPreferences,
      designation: typeof body.designation === 'string' ? body.designation.trim() : (currentPreferences.designation || 'Head of Department & Professor'),
      highestDegree: typeof body.highestDegree === 'string' ? body.highestDegree.trim() : (currentPreferences.highestDegree || 'Ph.D.'),
      specialization: typeof body.specialization === 'string' ? body.specialization.trim() : currentPreferences.specialization,
      institutionName: typeof body.institutionName === 'string' ? body.institutionName.trim() : currentPreferences.institutionName,
      teachingExperienceYears: body.teachingExperienceYears !== undefined ? String(body.teachingExperienceYears).trim() : currentPreferences.teachingExperienceYears,
      industryExperienceYears: body.industryExperienceYears !== undefined ? String(body.industryExperienceYears).trim() : currentPreferences.industryExperienceYears,
      leadershipExperienceYears: body.leadershipExperienceYears !== undefined ? String(body.leadershipExperienceYears).trim() : (currentPreferences.leadershipExperienceYears || '6'),
      supportedProgrammes: Array.isArray(body.supportedProgrammes) ? body.supportedProgrammes.filter((p: any) => typeof p === 'string') : (currentPreferences.supportedProgrammes || []),
      academicResponsibilities: Array.isArray(body.academicResponsibilities) ? body.academicResponsibilities.filter((r: any) => typeof r === 'string') : (currentPreferences.academicResponsibilities || []),
      programmeScope: typeof body.programmeScope === 'string' ? body.programmeScope.trim() : currentPreferences.programmeScope,
      departmentOffice: typeof body.departmentOffice === 'string' ? body.departmentOffice.trim() : currentPreferences.departmentOffice,
      departmentContact: typeof body.departmentContact === 'string' ? body.departmentContact.trim() : currentPreferences.departmentContact,
      placementResponsibilities: Array.isArray(body.placementResponsibilities) ? body.placementResponsibilities.filter((r: any) => typeof r === 'string') : (currentPreferences.placementResponsibilities || []),
      industryCollaborations: Array.isArray(body.industryCollaborations) ? body.industryCollaborations.filter((c: any) => typeof c === 'string') : (currentPreferences.industryCollaborations || []),
      recruitmentInitiatives: Array.isArray(body.recruitmentInitiatives) ? body.recruitmentInitiatives.filter((i: any) => typeof i === 'string') : (currentPreferences.recruitmentInitiatives || []),
      certifications: Array.isArray(body.certifications) ? body.certifications : (currentPreferences.certifications || []),
      publications: Array.isArray(body.publications) ? body.publications : (currentPreferences.publications || []),
      leadershipMilestones: Array.isArray(body.leadershipMilestones) ? body.leadershipMilestones : (currentPreferences.leadershipMilestones || []),
      officeHours: typeof body.officeHours === 'string' ? body.officeHours.trim() : (currentPreferences.officeHours || '02:00 PM - 04:30 PM'),
      availableDays: Array.isArray(body.availableDays) ? body.availableDays : (currentPreferences.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
      meetingMode: ['IN_PERSON', 'VIRTUAL', 'HYBRID'].includes(body.meetingMode) ? body.meetingMode : (currentPreferences.meetingMode || 'HYBRID'),
      departmentMeetingSchedule: typeof body.departmentMeetingSchedule === 'string' ? body.departmentMeetingSchedule.trim() : currentPreferences.departmentMeetingSchedule,
      communicationPreferences: typeof body.communicationPreferences === 'string' ? body.communicationPreferences.trim() : currentPreferences.communicationPreferences,
      isAvailable: typeof body.isAvailable === 'boolean' ? body.isAvailable : (currentPreferences.isAvailable ?? true),
      unavailabilityNote: typeof body.unavailabilityNote === 'string' ? body.unavailabilityNote.trim() : (currentPreferences.unavailabilityNote || ''),
      // Institutional verification cannot be self-awarded by client requests
      institutionalVerificationStatus: currentPreferences.institutionalVerificationStatus || (existingProfile?.employeeId ? 'VERIFIED' : 'PENDING'),
    };

    // 4. Extract standard Profile model fields (PROTECT official department assignment)
    const validProfileUpdates: Record<string, any> = {
      phone: typeof body.phone === 'string' ? body.phone.trim() : undefined,
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
        department: existingProfile?.department || 'Artificial Intelligence & Data Science',
        ...validProfileUpdates,
        careerPreferences: updatedPreferences,
      },
      update: validProfileUpdates,
      include: {
        education: { orderBy: { startYear: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
      }
    });

    // 6. Handle optional structured Education items if sent
    if (Array.isArray(body.educationList)) {
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
      }
    });

    const completion = calculateHODCompletion(user, finalProfile);

    return NextResponse.json({
      success: true,
      message: 'HOD profile updated successfully',
      data: {
        profile: finalProfile,
        completion
      }
    });
  } catch (error: any) {
    console.error('Error updating HOD profile:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to update HOD profile' },
      { status: 500 }
    );
  }
}
