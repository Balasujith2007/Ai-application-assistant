import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getStudentOpportunityStatus } from '@/lib/opportunityUtils';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type') || 'ALL';
    const statusFilter = searchParams.get('status') || 'ALL';
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

    const registrations = await prisma.opportunityRegistration.findMany({
      where: {
        studentId: userId
      },
      include: {
        opportunity: true
      },
      orderBy: { initiatedAt: 'desc' }
    });

    const history = registrations
      .map((reg) => {
        const opp = reg.opportunity;
        const computedStatus = getStudentOpportunityStatus(opp, reg);

        return {
          id: reg.id,
          opportunityId: opp.id,
          title: opp.title || opp.role || 'Opportunity',
          organization: opp.organization || opp.companyName || 'Host Organization',
          companyName: opp.companyName || opp.organization || 'Company',
          role: reg.role || opp.role || opp.title,
          type: opp.type,
          opportunityUrl: opp.opportunityUrl || '',
          registrationUrl: opp.registrationUrl || opp.applyUrl || '',
          startDate: opp.startDate || null,
          endDate: opp.endDate || null,
          applicationDeadline: opp.applicationDeadline || opp.deadline || null,
          initiatedAt: reg.initiatedAt,
          appliedAt: reg.appliedAt || reg.initiatedAt,
          registeredAt: reg.registeredAt || null,
          startedAt: reg.startedAt || opp.startDate || null,
          completedAt: reg.completedAt || (computedStatus === 'COMPLETED' ? opp.endDate || reg.updatedAt : null),
          status: computedStatus,
          outcome: reg.outcome || (computedStatus === 'COMPLETED' ? 'Completed' : null),
          certificateUrl: reg.certificateUrl || null,
          notes: reg.notes || null,
          opportunityStatus: opp.status
        };
      })
      .filter((item) => {
        // Type filter
        if (typeFilter !== 'ALL') {
          if (typeFilter === 'HACKATHONS' && item.type !== 'HACKATHON') return false;
          if (typeFilter === 'INTERNSHIPS' && item.type !== 'INTERNSHIP') return false;
          if (typeFilter === 'JOBS' && item.type !== 'JOB' && item.type !== 'FULL_TIME') return false;
          if (typeFilter === 'COMPETITIONS' && item.type !== 'COMPETITION') return false;
          if (typeFilter === 'WORKSHOPS' && item.type !== 'WORKSHOP') return false;
          if (!['HACKATHONS', 'INTERNSHIPS', 'JOBS', 'COMPETITIONS', 'WORKSHOPS'].includes(typeFilter) && item.type !== typeFilter) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'COMPLETED' && item.status !== 'COMPLETED') return false;
          if (statusFilter === 'ONGOING' && item.status !== 'ONGOING') return false;
          if (statusFilter === 'REGISTERED' && item.status !== 'REGISTERED') return false;
          if (statusFilter !== 'COMPLETED' && statusFilter !== 'ONGOING' && statusFilter !== 'REGISTERED' && item.status !== statusFilter) {
            return false;
          }
        }

        // Search query
        if (searchQuery) {
          const matchesTitle = item.title.toLowerCase().includes(searchQuery);
          const matchesOrg = item.organization.toLowerCase().includes(searchQuery);
          const matchesRole = (item.role || '').toLowerCase().includes(searchQuery);
          if (!matchesTitle && !matchesOrg && !matchesRole) return false;
        }

        return true;
      });

    return NextResponse.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('Error fetching opportunity history:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch history.' }, { status: 500 });
  }
}
