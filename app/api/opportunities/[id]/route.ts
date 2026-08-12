import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getNormalizedDeadline } from '@/lib/utils';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (existing.postedById !== userId && user.role !== 'HOD' && user.role !== 'ADMIN')) {
      return NextResponse.json({ message: 'Forbidden: You cannot edit this opportunity.' }, { status: 403 });
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        organization: body.organization ?? existing.organization,
        companyName: body.organization ?? existing.organization,
        role: body.title ?? existing.role,
        type: body.type ?? existing.type,
        description: body.description ?? existing.description,
        opportunityUrl: body.opportunityUrl ?? existing.opportunityUrl,
        registrationUrl: body.registrationUrl ?? existing.registrationUrl,
        applyUrl: body.registrationUrl ?? existing.applyUrl,
        location: body.location ?? existing.location,
        mode: body.mode ?? existing.mode,
        salary: body.salary ?? existing.salary,
        stipend: body.stipend ?? existing.stipend,
        prize: body.prize ?? existing.prize,
        openings: body.openings ? parseInt(body.openings) : existing.openings,
        eligibility: body.eligibility ?? existing.eligibility,
        additionalInfo: body.additionalInfo ?? existing.additionalInfo,
        applicationDeadline: body.applicationDeadline ? (getNormalizedDeadline(body.applicationDeadline) || new Date(body.applicationDeadline)) : existing.applicationDeadline,
        deadline: body.applicationDeadline ? (getNormalizedDeadline(body.applicationDeadline) || new Date(body.applicationDeadline)) : existing.deadline,
        startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
        endDate: body.endDate ? new Date(body.endDate) : existing.endDate,
        requiredSkills: Array.isArray(body.requiredSkills) ? body.requiredSkills : existing.requiredSkills,
        status: body.status ?? existing.status
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json({ success: false, message: 'Failed to update opportunity.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (existing.postedById !== userId && user.role !== 'HOD' && user.role !== 'ADMIN')) {
      return NextResponse.json({ message: 'Forbidden: You cannot delete this opportunity.' }, { status: 403 });
    }

    await prisma.opportunity.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Opportunity deleted successfully.' });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete opportunity.' }, { status: 500 });
  }
}
