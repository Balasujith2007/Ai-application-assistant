import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getNormalizedDeadline } from '@/lib/utils';

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
    const filter = searchParams.get('filter'); // my, published, draft, closed

    let whereClause: any = {};

    if (user.role === 'STUDENT') {
      whereClause.status = 'PUBLISHED';
      if (type && type !== 'ALL') {
        whereClause.type = type as any;
      }
    } else if (user.role === 'MENTOR') {
      if (filter === 'my') {
        whereClause.postedById = user.id;
      }
      if (filter === 'draft') {
        whereClause.postedById = user.id;
        whereClause.status = 'DRAFT';
      } else if (filter === 'closed') {
        whereClause.postedById = user.id;
        whereClause.status = 'CLOSED';
      } else if (filter === 'published') {
        whereClause.postedById = user.id;
        whereClause.status = 'PUBLISHED';
      }
      if (type && type !== 'ALL') {
        whereClause.type = type as any;
      }
    } else { // HOD, PLACEMENT_CELL, ADMIN
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

    const formatted = opportunities.map((opp) => {
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

    if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'PLACEMENT_CELL' && user.role !== 'ADMIN')) {
      return NextResponse.json({ message: 'Only Mentors and HODs can create opportunities.' }, { status: 403 });
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

    if (!title || !organization || !description || !applicationDeadline) {
      return NextResponse.json({ message: 'Title, Organization, Description, and Deadline are required.' }, { status: 400 });
    }

    const newOpportunity = await prisma.opportunity.create({
      data: {
        title,
        organization,
        companyName: organization,
        role: title,
        type: type || 'JOB',
        description,
        opportunityUrl: opportunityUrl || registrationUrl || '',
        registrationUrl: registrationUrl || opportunityUrl || '',
        applyUrl: registrationUrl || opportunityUrl || '',
        location: location || 'Online',
        mode: mode || 'ONLINE',
        salary,
        stipend,
        prize,
        openings: openings ? parseInt(openings) : null,
        eligibility,
        additionalInfo,
        applicationDeadline: getNormalizedDeadline(applicationDeadline) || new Date(applicationDeadline),
        deadline: getNormalizedDeadline(applicationDeadline) || new Date(applicationDeadline),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
        postedById: user.id,
        postedByRole: user.role,
        status: status || 'PUBLISHED',
        targetAudience: targetAudience || 'ALL_STUDENTS',
        targetDepartment: targetDepartment || null,
        targetYear: targetYear ? parseInt(targetYear) : null,
        targetSection: targetSection || null
      }
    });

    // Create Broadcast Notifications if PUBLISHED
    if (newOpportunity.status === 'PUBLISHED') {
      let recipientQuery: any = {};
      
      if (user.role === 'HOD' || targetAudience) {
        if (targetAudience === 'ALL_STUDENTS') {
          recipientQuery.role = 'STUDENT';
        } else if (targetAudience === 'ALL_MENTORS') {
          recipientQuery.role = 'MENTOR';
        } else if (targetAudience === 'BOTH') {
          recipientQuery.role = { in: ['STUDENT', 'MENTOR'] };
        } else {
          recipientQuery.role = 'STUDENT';
        }
      } else {
        recipientQuery.role = 'STUDENT';
      }

      const targetUsers = await prisma.user.findMany({
        where: recipientQuery,
        select: { id: true }
      });

      if (targetUsers.length > 0) {
        const notificationsData = targetUsers.map((u) => ({
          userId: u.id,
          senderId: user.id,
          type: 'OPPORTUNITY_POSTED',
          title: `New ${newOpportunity.type} Opportunity: ${newOpportunity.title}`,
          message: `${newOpportunity.organization} has posted a new opportunity. Deadline: ${new Date(newOpportunity.applicationDeadline).toLocaleDateString()}`,
          relatedEntityId: newOpportunity.id,
          relatedEntityType: 'OPPORTUNITY',
          link: '/dashboard/student/opportunities'
        }));

        await prisma.notification.createMany({
          data: notificationsData
        });
      }
    }

    return NextResponse.json({ success: true, data: newOpportunity }, { status: 201 });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json({ success: false, message: 'Failed to create opportunity.' }, { status: 500 });
  }
}
