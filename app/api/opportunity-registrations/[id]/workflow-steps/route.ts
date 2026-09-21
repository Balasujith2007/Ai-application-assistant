import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { addWorkflowStep } from '@/lib/opportunity/lifecycle.service';
import { WorkflowStepType, WorkflowStepStatus } from '@prisma/client';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: registrationId } = await params;

    const registration = await prisma.opportunityRegistration.findUnique({
      where: { id: registrationId },
      include: {
        workflowSteps: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        opportunity: true,
        student: { select: { id: true, name: true, email: true } }
      }
    });

    if (!registration) {
      return NextResponse.json({ message: 'Registration not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        registration,
        workflowSteps: registration.workflowSteps,
        statusHistory: registration.statusHistory
      }
    });
  } catch (error: any) {
    console.error('Error fetching workflow steps:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch workflow steps.' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'PLACEMENT_CELL' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id: registrationId } = await params;
    const body = await req.json();
    const { stepType, title, description, deadline, scheduledAt, meetingLink, notes } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ message: 'Step title is required.' }, { status: 400 });
    }

    const validStepTypes: WorkflowStepType[] = [
      'INTERVIEW',
      'TECHNICAL_ASSESSMENT',
      'DOCUMENT_SUBMISSION',
      'EXTERNAL_VERIFICATION',
      'JOINING',
      'OTHER'
    ];

    const normalizedStepType = stepType && validStepTypes.includes(stepType) ? stepType : 'INTERVIEW';

    const step = await addWorkflowStep({
      registrationId,
      stepType: normalizedStepType,
      title: title.trim(),
      description,
      deadline: deadline ? new Date(deadline) : null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      meetingLink,
      notes,
      actorId: userId
    });

    return NextResponse.json({
      success: true,
      message: `Workflow step "${title}" created successfully.`,
      data: step
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating workflow step:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to create workflow step.' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: registrationId } = await params;
    const body = await req.json();
    const { stepId, status, notes, submissionUrl } = body;

    if (!stepId) {
      return NextResponse.json({ message: 'stepId is required.' }, { status: 400 });
    }

    const validStatuses: WorkflowStepStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'WAIVED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ message: 'Invalid workflow step status.' }, { status: 400 });
    }

    const updated = await prisma.opportunityWorkflowStep.update({
      where: { id: stepId },
      data: {
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined,
        submissionUrl: submissionUrl !== undefined ? submissionUrl : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow step updated successfully.',
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating workflow step:', error);
    return NextResponse.json({ success: false, message: 'Failed to update workflow step.' }, { status: 500 });
  }
}
