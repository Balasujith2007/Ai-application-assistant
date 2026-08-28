import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getNormalizedDeadline } from '@/lib/utils';
import { sendOpportunityNotification } from '@/lib/email/notification.service';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const filter = searchParams.get('filter'); // my, published, draft, closed, all

    let whereClause: any = {};

    if (user.role === 'STUDENT') {
      whereClause.status = 'PUBLISHED';
      if (type && type !== 'ALL') {
        whereClause.type = type as any;
      }
    } else if (user.role === 'MENTOR') {
      // Data isolation: mentors see their own posted opportunities
      whereClause.postedById = user.id;

      if (filter === 'draft') {
        whereClause.status = 'DRAFT';
      } else if (filter === 'closed') {
        whereClause.status = 'CLOSED';
      } else if (filter === 'published') {
        whereClause.status = 'PUBLISHED';
      }
      if (type && type !== 'ALL') {
        whereClause.type = type as any;
      }
    } else { // HOD, PLACEMENT_CELL, ADMIN, SUPER_ADMIN
      if (filter === 'my') {
        whereClause.postedById = user.id;
      } else if (filter === 'draft') {
        whereClause.postedById = user.id;
        whereClause.status = 'DRAFT';
      } else if (filter === 'closed') {
        whereClause.status = 'CLOSED';
      } else if (filter === 'published') {
        whereClause.status = 'PUBLISHED';
      }

      if (type && type !== 'ALL') {
        whereClause.type = type as any;
      }
    }

    const opportunities = await prisma.opportunity.findMany({
      where: whereClause,
      include: {
        postedBy: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true
          }
        },
        registrations: user.role === 'STUDENT' ? {
          where: { studentId: user.id },
          select: { id: true, status: true, registeredAt: true }
        } : {
          select: { id: true, status: true, studentId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = opportunities.map((opp: any) => {
      const userRegistration = user.role === 'STUDENT' && opp.registrations.length > 0 ? opp.registrations[0] : null;
      const isRegistered = userRegistration ? userRegistration.status === 'REGISTERED' : false;

      return {
        ...opp,
        isRegistered,
        userRegistrationStatus: userRegistration ? userRegistration.status : null,
        studentRegistration: userRegistration ? {
          status: userRegistration.status,
          initiatedAt: (userRegistration as any).initiatedAt || null,
          registeredAt: (userRegistration as any).registeredAt || null
        } : null,
        registrationCount: opp.registrations.length
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch opportunities.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'PLACEMENT_CELL' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Only Mentors, HODs, and Admin can create opportunities.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      organization,
      type,
      description,
      opportunityUrl,
      registrationUrl,
      location,
      mode,
      salary,
      stipend,
      prize,
      openings,
      eligibility,
      additionalInfo,
      applicationDeadline,
      startDate,
      endDate,
      requiredSkills,
      status,
      targetAudience,
      targetDepartment,
      targetYear,
      targetSection
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ message: 'Opportunity title is required.' }, { status: 400 });
    }
    if (!organization || !organization.trim()) {
      return NextResponse.json({ message: 'Company / Organization is required.' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ message: 'Opportunity description is required.' }, { status: 400 });
    }
    if (!applicationDeadline) {
      return NextResponse.json({ message: 'Application deadline is required.' }, { status: 400 });
    }

    const deadlineDate = getNormalizedDeadline(applicationDeadline) || new Date(applicationDeadline);
    if (isNaN(deadlineDate.getTime())) {
      return NextResponse.json({ message: 'Please enter a valid application deadline.' }, { status: 400 });
    }

    // Helper to safely parse optional dates
    const parseSafeDate = (d: any): Date | null => {
      if (!d || typeof d !== 'string' && !(d instanceof Date)) return null;
      if (typeof d === 'string' && !d.trim()) return null;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // Helper to normalize opportunity type enum
    const validTypes = ['JOB', 'FULL_TIME', 'INTERNSHIP', 'HACKATHON', 'COMPETITION', 'SCHOLARSHIP', 'WORKSHOP', 'OTHER'];
    const normalizedType = type && validTypes.includes(type.toUpperCase()) ? type.toUpperCase() : 'JOB';

    // Helper to normalize mode enum
    const validModes = ['ONLINE', 'OFFLINE', 'HYBRID'];
    const normalizedMode = mode && validModes.includes(mode.toUpperCase()) ? mode.toUpperCase() : 'ONLINE';

    // Helper to normalize status enum
    const validStatuses = ['DRAFT', 'PUBLISHED', 'CLOSED'];
    const normalizedStatus = status && validStatuses.includes(status.toUpperCase()) ? status.toUpperCase() : 'PUBLISHED';

    const parsedOpenings = openings && !isNaN(parseInt(openings)) ? parseInt(openings) : null;
    const parsedYear = targetYear && !isNaN(parseInt(targetYear)) ? parseInt(targetYear) : null;

    const newOpportunity = await prisma.opportunity.create({
      data: {
        title: title.trim(),
        organization: organization.trim(),
        companyName: organization.trim(),
        role: title.trim(),
        type: normalizedType as any,
        description: description.trim(),
        opportunityUrl: (opportunityUrl || registrationUrl || '').trim(),
        registrationUrl: (registrationUrl || opportunityUrl || '').trim(),
        applyUrl: (registrationUrl || opportunityUrl || '').trim(),
        location: (location || 'Online').trim(),
        mode: normalizedMode as any,
        salary: salary ? salary.trim() : null,
        stipend: stipend ? stipend.trim() : null,
        prize: prize ? prize.trim() : null,
        openings: parsedOpenings,
        eligibility: eligibility ? eligibility.trim() : null,
        additionalInfo: additionalInfo ? additionalInfo.trim() : null,
        applicationDeadline: deadlineDate,
        deadline: deadlineDate,
        startDate: parseSafeDate(startDate),
        endDate: parseSafeDate(endDate),
        requiredSkills: Array.isArray(requiredSkills)
          ? requiredSkills.map((s: string) => s.trim()).filter(Boolean)
          : typeof requiredSkills === 'string'
          ? requiredSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        postedById: user.id,
        postedByRole: user.role,
        status: normalizedStatus as any,
        targetAudience: targetAudience || 'ALL_STUDENTS',
        targetDepartment: targetDepartment || null,
        targetYear: parsedYear,
        targetSection: targetSection || null
      }
    });

    // Create Broadcast Notifications if PUBLISHED
    if (newOpportunity.status === 'PUBLISHED') {
      try {
        const recipientConditions: any[] = [];

        const profileFilter: any = {};
        if (newOpportunity.targetDepartment) {
          profileFilter.department = { equals: newOpportunity.targetDepartment, mode: 'insensitive' };
        }
        if (newOpportunity.targetYear) {
          profileFilter.year = newOpportunity.targetYear;
        }
        if (newOpportunity.targetSection) {
          profileFilter.section = { equals: newOpportunity.targetSection, mode: 'insensitive' };
        }

        const hasProfileFilter = Object.keys(profileFilter).length > 0;
        const audience = newOpportunity.targetAudience || 'ALL_STUDENTS';

        if (audience === 'ALL_STUDENTS' || audience === 'BOTH' || audience === 'STUDENTS_MENTORS') {
          recipientConditions.push({
            role: 'STUDENT',
            ...(hasProfileFilter ? { profile: profileFilter } : {})
          });
        }

        if (audience === 'ALL_MENTORS' || audience === 'BOTH' || audience === 'STUDENTS_MENTORS') {
          recipientConditions.push({
            role: 'MENTOR'
          });
        }

        if (recipientConditions.length === 0) {
          recipientConditions.push({ role: 'STUDENT' });
        }

        const targetUsers = await prisma.user.findMany({
          where: { OR: recipientConditions },
          select: { id: true }
        });

        const uniqueUserIds: string[] = Array.from(new Set(targetUsers.map((u: { id: string }) => u.id)));

        if (uniqueUserIds.length > 0) {
          sendOpportunityNotification({
            userIds: uniqueUserIds,
            senderId: user.id,
            opportunity: newOpportunity,
          }).catch((err) => console.error('Notification dispatch error:', err));
        }
      } catch (notifErr) {
        console.error('Error preparing notifications for opportunity:', notifErr);
      }
    }

    return NextResponse.json({ success: true, data: newOpportunity }, { status: 201 });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json({ success: false, message: 'Failed to create opportunity.' }, { status: 500 });
  }
}
