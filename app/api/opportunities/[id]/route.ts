import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getNormalizedDeadline } from '@/lib/utils';

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ message: 'Opportunity ID is required.' }, { status: 400 });
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
      include: {
        postedBy: {
          select: { id: true, name: true, role: true, email: true }
        },
        registrations: {
          include: {
            student: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    const isRegistered = opportunity.registrations.some((r) => r.studentId === userId);

    return NextResponse.json({
      success: true,
      data: {
        ...opportunity,
        isRegistered
      }
    });
  } catch (error) {
    console.error('Error fetching opportunity detail:', error);
    return NextResponse.json({ success: false, message: 'Opportunity not found.' }, { status: 404 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ message: 'Opportunity ID is required.' }, { status: 400 });
    }
    const body = await req.json();

    const existing = await prisma.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (existing.postedById !== userId && user.role !== 'HOD' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden: You cannot edit this opportunity.' }, { status: 403 });
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
    const normalizedType = body.type && validTypes.includes(body.type.toUpperCase()) ? body.type.toUpperCase() : existing.type;

    // Helper to normalize mode enum
    const validModes = ['ONLINE', 'OFFLINE', 'HYBRID'];
    const normalizedMode = body.mode && validModes.includes(body.mode.toUpperCase()) ? body.mode.toUpperCase() : existing.mode;

    // Helper to normalize status enum
    const validStatuses = ['DRAFT', 'PUBLISHED', 'CLOSED'];
    const normalizedStatus = body.status && validStatuses.includes(body.status.toUpperCase()) ? body.status.toUpperCase() : existing.status;

    const parsedOpenings = body.openings && !isNaN(parseInt(body.openings)) ? parseInt(body.openings) : existing.openings;

    const updatedDeadline = body.applicationDeadline
      ? (getNormalizedDeadline(body.applicationDeadline) || parseSafeDate(body.applicationDeadline) || existing.applicationDeadline)
      : existing.applicationDeadline;

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        title: body.title ? body.title.trim() : existing.title,
        organization: body.organization ? body.organization.trim() : existing.organization,
        companyName: body.organization ? body.organization.trim() : existing.companyName,
        role: body.title ? body.title.trim() : existing.role,
        type: normalizedType as any,
        description: body.description ? body.description.trim() : existing.description,
        opportunityUrl: body.opportunityUrl !== undefined ? body.opportunityUrl.trim() : existing.opportunityUrl,
        registrationUrl: body.registrationUrl !== undefined ? body.registrationUrl.trim() : existing.registrationUrl,
        applyUrl: body.registrationUrl !== undefined ? body.registrationUrl.trim() : existing.applyUrl,
        location: body.location !== undefined ? body.location.trim() : existing.location,
        mode: normalizedMode as any,
        salary: body.salary !== undefined ? body.salary : existing.salary,
        stipend: body.stipend !== undefined ? body.stipend : existing.stipend,
        prize: body.prize !== undefined ? body.prize : existing.prize,
        openings: parsedOpenings,
        eligibility: body.eligibility !== undefined ? body.eligibility : existing.eligibility,
        additionalInfo: body.additionalInfo !== undefined ? body.additionalInfo : existing.additionalInfo,
        applicationDeadline: updatedDeadline,
        deadline: updatedDeadline,
        startDate: body.startDate !== undefined ? parseSafeDate(body.startDate) : existing.startDate,
        endDate: body.endDate !== undefined ? parseSafeDate(body.endDate) : existing.endDate,
        requiredSkills: Array.isArray(body.requiredSkills)
          ? body.requiredSkills.map((s: string) => s.trim()).filter(Boolean)
          : typeof body.requiredSkills === 'string'
          ? body.requiredSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : existing.requiredSkills,
        status: normalizedStatus as any
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json({ success: false, message: 'Failed to update opportunity.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ message: 'Opportunity ID is required.' }, { status: 400 });
    }
    const existing = await prisma.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (existing.postedById !== userId && user.role !== 'HOD' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden: You cannot delete this opportunity.' }, { status: 403 });
    }

    await prisma.opportunity.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Opportunity deleted successfully.' });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete opportunity.' }, { status: 500 });
  }
}
