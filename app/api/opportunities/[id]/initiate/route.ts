import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { isOpportunityOpen } from '@/lib/utils';
import { evaluateFormMatching } from '@/lib/fieldNormalization';
import type { ApplicationType, ApplicationStatus, OpportunityRegistrationStatus } from '@prisma/client';

// Helper to fetch complete student profile details & active resume details for Application Assistant
async function getStudentProfileData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          education: { orderBy: { startYear: 'desc' } },
          projects: { orderBy: { id: 'desc' } },
          experiences: { orderBy: { startDate: 'desc' } },
          skills: { include: { skill: true } }
        }
      },
      verifiedProfiles: true,
      resumes: {
        where: { isActive: true },
        orderBy: { uploadedAt: 'desc' },
        take: 1
      }
    }
  });

  if (!user) return null;

  const profile = user.profile;
  const verifiedMap = new Map(user.verifiedProfiles.map((vp) => [vp.platform, vp]));
  const activeResume = user.resumes[0] || null;

  const skillsList = profile?.skills?.map((s) => s.skill.name) || [];

  return {
    userId: user.id,
    name: user.name,
    fullName: user.name,
    email: user.email,
    phone: profile?.phone || '',
    department: profile?.department || '',
    year: profile?.year ? `${profile.year}${profile.year === 1 ? 'st' : profile.year === 2 ? 'nd' : profile.year === 3 ? 'rd' : 'th'} Year` : '',
    rawYear: profile?.year || null,
    college: profile?.college || '',
    cgpa: profile?.education?.[0]?.grade || '',
    location: profile?.location || '',
    githubUrl: profile?.githubUrl || verifiedMap.get('GITHUB')?.profileUrl || '',
    linkedinUrl: profile?.linkedinUrl || verifiedMap.get('LINKEDIN')?.profileUrl || '',
    codolioUrl: profile?.codolioUrl || verifiedMap.get('CODOLIO')?.profileUrl || '',
    verifiedGitHub: verifiedMap.get('GITHUB')?.verificationStatus === 'VERIFIED' || !!verifiedMap.get('GITHUB'),
    verifiedLinkedIn: verifiedMap.get('LINKEDIN')?.verificationStatus === 'VERIFIED' || !!verifiedMap.get('LINKEDIN'),
    verifiedCodolio: verifiedMap.get('CODOLIO')?.verificationStatus === 'VERIFIED' || !!verifiedMap.get('CODOLIO'),
    resumeName: activeResume ? activeResume.originalName : null,
    resumeUrl: activeResume ? activeResume.fileUrl : null,
    activeResume: activeResume ? {
      id: activeResume.id,
      fileName: activeResume.fileName,
      originalName: activeResume.originalName,
      fileUrl: activeResume.fileUrl,
      uploadedAt: activeResume.uploadedAt
    } : null,
    projectsCount: profile?.projects?.length || 0,
    experiencesCount: profile?.experiences?.length || 0,
    skillsList,
    educationList: profile?.education || [],
    projectsList: profile?.projects || [],
    experiencesList: profile?.experiences || []
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const { id: opportunityId } = await params;
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found.', message: 'Opportunity not found.' }, { status: 404 });
    }

    const studentData = await getStudentProfileData(userId);
    if (!studentData) {
      return NextResponse.json({ success: false, error: 'Student account not found.', message: 'Student account not found.' }, { status: 404 });
    }

    // Check existing registration
    const existingRegistration = await prisma.opportunityRegistration.findUnique({
      where: {
        opportunityId_studentId: {
          opportunityId,
          studentId: userId
        }
      }
    });

    // Check existing application
    const existingApplication = await prisma.application.findFirst({
      where: { userId, opportunityId }
    });

    const isAlreadyRegistered = Boolean(
      existingRegistration &&
      ['REGISTERED', 'SHORTLISTED', 'SELECTED', 'COMPLETED'].includes(String(existingRegistration.status))
    );

    const isAlreadyApplied = Boolean(
      existingApplication &&
      String(existingApplication.status) !== 'INITIATED' &&
      String(existingApplication.status) !== 'SAVED'
    );

    const isOpen = isOpportunityOpen(opportunity.applicationDeadline, opportunity.status);
    const registrationUrl = opportunity.registrationUrl || opportunity.opportunityUrl || opportunity.applyUrl || '';

    // Standard registration form fields to evaluate matching against
    const standardFields = ['Full Name', 'Email', 'Phone', 'College', 'Department', 'Year', 'CGPA', 'GitHub Profile', 'LinkedIn Profile', 'Codolio Profile', 'Active Resume'];
    const matchingEvaluation = evaluateFormMatching(standardFields, studentData);

    return NextResponse.json({
      success: true,
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        organization: opportunity.organization,
        companyName: opportunity.companyName || opportunity.organization,
        role: opportunity.role || opportunity.title,
        type: opportunity.type,
        opportunityUrl: opportunity.opportunityUrl,
        registrationUrl: opportunity.registrationUrl,
        applyUrl: opportunity.applyUrl,
        effectiveRegistrationUrl: registrationUrl,
        deadline: opportunity.applicationDeadline,
        isOpen
      },
      studentData,
      matchingEvaluation,
      existingRegistration: existingRegistration ? {
        id: existingRegistration.id,
        status: existingRegistration.status,
        initiatedAt: existingRegistration.initiatedAt,
        registeredAt: existingRegistration.registeredAt
      } : null,
      existingApplication: existingApplication ? {
        id: existingApplication.id,
        status: existingApplication.status,
        createdAt: existingApplication.createdAt
      } : null,
      alreadyExists: isAlreadyRegistered || isAlreadyApplied,
      alreadyInitiated: !!existingRegistration && existingRegistration.status === 'INITIATED'
    });
  } catch (error: unknown) {
    console.error('Error fetching initiate details:', error);
    const errMessage = (error as Error)?.message || 'Failed to load details.';
    return NextResponse.json({ success: false, error: errMessage, message: errMessage }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const { id: opportunityId } = await params;
    const body = await req.json().catch(() => ({}));

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found.', message: 'Opportunity not found.' }, { status: 404 });
    }

    if (!isOpportunityOpen(opportunity.applicationDeadline, opportunity.status)) {
      return NextResponse.json({ success: false, error: 'Opportunity registration is closed.', message: 'Opportunity registration is closed.' }, { status: 400 });
    }

    const registrationUrl = opportunity.registrationUrl || opportunity.opportunityUrl || opportunity.applyUrl || '';
    if (!registrationUrl || (!registrationUrl.startsWith('http://') && !registrationUrl.startsWith('https://'))) {
      return NextResponse.json({ success: false, error: 'Registration link is unavailable.', message: 'Registration link is unavailable.' }, { status: 400 });
    }

    // Check duplicate or existing registration
    const existingReg = await prisma.opportunityRegistration.findUnique({
      where: {
        opportunityId_studentId: {
          opportunityId,
          studentId: userId
        }
      }
    });

    if (existingReg) {
      if (String(existingReg.status) === 'INITIATED') {
        return NextResponse.json({
          success: true,
          status: 'INITIATED',
          alreadyInitiated: true,
          opportunityId,
          registrationId: existingReg.id,
          registrationUrl,
          registration: existingReg
        });
      }

      if (['REGISTERED', 'SHORTLISTED', 'SELECTED', 'COMPLETED'].includes(String(existingReg.status))) {
        return NextResponse.json({
          success: true,
          status: existingReg.status,
          alreadyExists: true,
          opportunityId,
          registrationId: existingReg.id,
          registrationUrl,
          registration: existingReg
        });
      }
    }

    // Save missing details to profile if requested
    if (body.saveToProfile && body.missingFields) {
      const updateData: Record<string, string> = {};
      if (body.missingFields.phone) updateData.phone = body.missingFields.phone;
      if (body.missingFields.department) updateData.department = body.missingFields.department;
      if (body.missingFields.college) updateData.college = body.missingFields.college;
      if (body.missingFields.location) updateData.location = body.missingFields.location;

      if (Object.keys(updateData).length > 0) {
        await prisma.profile.upsert({
          where: { userId },
          create: { userId, ...updateData },
          update: updateData
        });
      }
    }

    // Upsert Registration with INITIATED status
    const registration = await prisma.opportunityRegistration.upsert({
      where: {
        opportunityId_studentId: {
          opportunityId,
          studentId: userId
        }
      },
      update: {
        status: 'INITIATED' as OpportunityRegistrationStatus,
        initiatedAt: new Date()
      },
      create: {
        opportunityId,
        studentId: userId,
        status: 'INITIATED' as OpportunityRegistrationStatus,
        initiatedAt: new Date()
      }
    });

    // Create/Upsert Application record with INITIATED status
    let appType: ApplicationType = 'JOB';
    if (['HACKATHON', 'INTERNSHIP', 'JOB', 'COMPETITION', 'WORKSHOP', 'SCHOLARSHIP'].includes(opportunity.type)) {
      appType = opportunity.type as ApplicationType;
    }

    const studentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    let application = await prisma.application.findFirst({
      where: { userId, opportunityId }
    });

    if (!application) {
      application = await prisma.application.create({
        data: {
          userId,
          opportunityId,
          companyName: opportunity.organization || opportunity.companyName || 'Host Organization',
          position: opportunity.title || opportunity.role || 'Participant',
          applicationType: appType,
          applicationUrl: registrationUrl,
          location: opportunity.location || 'Online',
          description: opportunity.description,
          status: 'INITIATED' as ApplicationStatus,
          deadline: opportunity.applicationDeadline,
          githubUrl: studentUser?.profile?.githubUrl || null,
          codolioUrl: studentUser?.profile?.codolioUrl || null
        }
      });
    } else if ((application.status as string) === 'SAVED') {
      application = await prisma.application.update({
        where: { id: application.id },
        data: {
          status: 'INITIATED' as ApplicationStatus,
          applicationUrl: registrationUrl
        }
      });
    }

    return NextResponse.json({
      success: true,
      status: 'INITIATED',
      opportunityId,
      registrationId: registration.id,
      registrationUrl,
      registration,
      application,
      message: 'Registration initiated.'
    });

  } catch (error: unknown) {
    console.error('Error initiating opportunity application:', error);
    const errMessage = (error as Error)?.message || 'Failed to initiate application.';
    return NextResponse.json({
      success: false,
      error: errMessage,
      message: errMessage
    }, { status: 500 });
  }
}
