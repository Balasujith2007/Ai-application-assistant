import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: opportunityId } = await params;

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'PLACEMENT_CELL' && user.role !== 'ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const registrations = await prisma.opportunityRegistration.findMany({
      where: { opportunityId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                college: true,
                department: true,
                year: true,
                section: true,
                githubUrl: true,
                linkedinUrl: true,
                codolioUrl: true
              }
            },
            verifiedProfiles: true,
            resumes: {
              where: { isActive: true },
              take: 1
            }
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      opportunity,
      data: registrations
    });

  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch registrations.' }, { status: 500 });
  }
}
