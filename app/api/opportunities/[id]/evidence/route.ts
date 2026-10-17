import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { processRegistrationEvidence } from '@/lib/verification/verificationService';
import { validateImageMagicBytes } from '@/lib/verification/evidenceStorage';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const { id: opportunityId } = await props.params;

    if (!opportunityId) {
      return NextResponse.json({ success: false, error: 'Opportunity ID is required.', message: 'Opportunity ID is required.' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found.', message: 'Student not found.' }, { status: 404 });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found.', message: 'Opportunity not found.' }, { status: 404 });
    }

    // Get or initialize OpportunityRegistration record
    let registration = await prisma.opportunityRegistration.findUnique({
      where: {
        opportunityId_studentId: {
          opportunityId,
          studentId: userId
        }
      }
    });

    if (!registration) {
      registration = await prisma.opportunityRegistration.create({
        data: {
          opportunityId,
          studentId: userId,
          status: 'STARTED' as any,
          startedAt: new Date(),
          initiatedAt: new Date()
        }
      });
    }

    // Extract multipart form data
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, error: 'Invalid form data. Expected multipart/form-data.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'No evidence file uploaded. Please select a screenshot.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file content using magic bytes and size
    const validation = validateImageMagicBytes(buffer);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid image file.' },
        { status: 400 }
      );
    }

    // Process evidence through Universal OCR & Cross-Verification Pipeline
    const verificationResult = await processRegistrationEvidence({
      imageBuffer: buffer,
      originalFilename: file.name || 'confirmation_screenshot.png',
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        profile: student.profile
      },
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        role: opportunity.role,
        organization: opportunity.organization,
        companyName: opportunity.companyName,
        registrationUrl: opportunity.registrationUrl || opportunity.opportunityUrl || opportunity.applyUrl,
        applicationDeadline: opportunity.applicationDeadline,
        type: opportunity.type
      },
      registration: {
        id: registration.id,
        opportunityId: registration.opportunityId,
        studentId: registration.studentId,
        status: registration.status,
        startedAt: registration.startedAt,
        initiatedAt: registration.initiatedAt,
        externalRegistrationId: registration.externalRegistrationId
      }
    });

    return NextResponse.json({
      success: verificationResult.success,
      status: verificationResult.status,
      decision: verificationResult.decision,
      extractedData: verificationResult.extractedData,
      validationResults: verificationResult.validationResults,
      evidenceId: verificationResult.evidenceId,
      ocrConfidence: verificationResult.ocrConfidence,
      ocrSnippet: verificationResult.ocrSnippet,
      message: verificationResult.decision.decisionReason
    });

  } catch (error: any) {
    console.error('Error handling evidence submission API:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error processing evidence.' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: opportunityId } = await props.params;

    if (!opportunityId) {
      return NextResponse.json({ success: false, error: 'Opportunity ID is required.' }, { status: 400 });
    }

    const registration = await prisma.opportunityRegistration.findUnique({
      where: {
        opportunityId_studentId: {
          opportunityId,
          studentId: userId
        }
      },
      include: {
        evidences: {
          orderBy: { submittedAt: 'desc' },
          take: 1
        }
      }
    });

    const latestEvidence = registration?.evidences?.[0] || null;

    return NextResponse.json({
      success: true,
      registration: registration ? {
        id: registration.id,
        status: registration.status,
        verificationMethod: registration.verificationMethod,
        verifiedAt: registration.verifiedAt,
        externalRegistrationId: registration.externalRegistrationId,
        confirmationEvidenceUrl: registration.confirmationEvidenceUrl
      } : null,
      evidence: latestEvidence ? {
        id: latestEvidence.id,
        evidenceFileUrl: latestEvidence.evidenceFileUrl,
        fileName: latestEvidence.fileName,
        fileSize: latestEvidence.fileSize,
        status: latestEvidence.status,
        ocrConfidence: latestEvidence.ocrConfidence,
        extractedData: latestEvidence.extractedData,
        validationResults: latestEvidence.validationResults,
        mismatchReasons: latestEvidence.mismatchReasons,
        reviewDecision: latestEvidence.reviewDecision,
        reviewerNotes: latestEvidence.reviewerNotes,
        submittedAt: latestEvidence.submittedAt
      } : null
    });

  } catch (error: any) {
    console.error('Error fetching registration evidence:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch evidence details.' },
      { status: 500 }
    );
  }
}
