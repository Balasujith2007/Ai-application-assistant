import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Audit Logs', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'ALL';
    const search = searchParams.get('search') || '';

    const whereClause: any = {};

    if (action !== 'ALL') {
      whereClause.action = action;
    }

    if (search) {
      whereClause.OR = [
        { details: { contains: search, mode: 'insensitive' } },
        { target: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // 1. Extract IDs to resolve in batch
    const regIds = new Set<string>();
    const oppIds = new Set<string>();
    const studentIds = new Set<string>();

    logs.forEach((l) => {
      if (l.target?.startsWith('OpportunityRegistration:')) {
        regIds.add(l.target.replace('OpportunityRegistration:', ''));
      }
      if (l.details && l.details.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(l.details);
          if (parsed.opportunityId) oppIds.add(parsed.opportunityId);
          if (parsed.studentId) studentIds.add(parsed.studentId);
        } catch {}
      }
    });

    // 2. Fetch references in parallel
    const [registrations, opportunities, students] = await Promise.all([
      regIds.size > 0
        ? prisma.opportunityRegistration.findMany({
            where: { id: { in: Array.from(regIds) } },
            select: {
              id: true,
              opportunity: { select: { id: true, title: true, companyName: true } },
              student: { select: { id: true, name: true, email: true } },
            },
          })
        : [],
      oppIds.size > 0
        ? prisma.opportunity.findMany({
            where: { id: { in: Array.from(oppIds) } },
            select: { id: true, title: true, companyName: true },
          })
        : [],
      studentIds.size > 0
        ? prisma.user.findMany({
            where: { id: { in: Array.from(studentIds) } },
            select: { id: true, name: true, email: true },
          })
        : [],
    ]);

    const regMap = new Map(registrations.map((r) => [r.id, r]));
    const oppMap = new Map(opportunities.map((o) => [o.id, o]));
    const studentMap = new Map(students.map((s) => [s.id, s]));

    // 3. Format and enrich each log
    const enrichedLogs = logs.map((log) => {
      let displayTarget = {
        title: log.target || 'N/A',
        subtitle: '',
        type: 'GENERAL',
      };

      let simpleSummary = log.details || 'No additional details provided.';
      let badges: Array<{ label: string; variant: 'green' | 'blue' | 'amber' | 'red' | 'gray' }> = [];
      let parsedJson: any = null;

      if (log.details && log.details.trim().startsWith('{')) {
        try {
          parsedJson = JSON.parse(log.details);
        } catch {}
      }

      // Format OpportunityRegistration logs
      if (log.target?.startsWith('OpportunityRegistration:')) {
        const regId = log.target.replace('OpportunityRegistration:', '');
        const reg = regMap.get(regId);
        const opp = reg?.opportunity || (parsedJson?.opportunityId ? oppMap.get(parsedJson.opportunityId) : null);
        const stu = reg?.student || (parsedJson?.studentId ? studentMap.get(parsedJson.studentId) : null);

        const oppTitle = opp
          ? `${opp.companyName && opp.companyName !== opp.title ? `${opp.companyName} — ` : ''}${opp.title}`
          : 'Opportunity';

        displayTarget = {
          title: oppTitle,
          subtitle: stu ? `Student: ${stu.name}` : `Reg #${regId.slice(-6)}`,
          type: 'REGISTRATION',
        };

        if (log.action === 'APPROVE_REGISTRATION_VERIFICATION') {
          simpleSummary = stu
            ? `Approved registration verification for ${stu.name}`
            : 'Approved registration verification';
          badges.push({ label: 'Status: VERIFIED', variant: 'green' });
          if (parsedJson?.reviewerNotes) {
            badges.push({ label: `Notes: ${parsedJson.reviewerNotes}`, variant: 'gray' });
          }
        } else if (log.action === 'SUBMIT_REGISTRATION_EVIDENCE') {
          simpleSummary = stu
            ? `Confirmation evidence submitted by ${stu.name}`
            : 'Confirmation evidence screenshot submitted';
          if (parsedJson?.status) {
            badges.push({
              label: parsedJson.status === 'PENDING_REVIEW' ? 'Pending Review' : parsedJson.status,
              variant: 'amber',
            });
          }
          if (parsedJson?.ocrConfidence !== undefined) {
            const pct = Math.round(
              Number(parsedJson.ocrConfidence) <= 1
                ? Number(parsedJson.ocrConfidence) * 100
                : Number(parsedJson.ocrConfidence)
            );
            badges.push({ label: `OCR Match: ${pct}%`, variant: 'blue' });
          }
          if (parsedJson?.mismatchCount !== undefined) {
            badges.push({
              label:
                parsedJson.mismatchCount === 0
                  ? '0 Mismatches'
                  : `${parsedJson.mismatchCount} Mismatch${parsedJson.mismatchCount > 1 ? 'es' : ''}`,
              variant: parsedJson.mismatchCount === 0 ? 'green' : 'red',
            });
          }
        } else if (log.action === 'REJECT_REGISTRATION_VERIFICATION') {
          simpleSummary = stu
            ? `Rejected registration verification for ${stu.name}`
            : 'Rejected registration verification';
          badges.push({ label: 'Status: REJECTED', variant: 'red' });
          if (parsedJson?.reason) {
            badges.push({ label: `Reason: ${parsedJson.reason}`, variant: 'red' });
          }
        }
      } else if (log.action === 'FEATURE_UPDATE') {
        displayTarget = {
          title: log.target || 'Feature Flag',
          subtitle: 'System Feature',
          type: 'FEATURE',
        };
        simpleSummary = `Updated feature configuration for ${log.target}`;
        if (log.details?.includes('enabled = true')) {
          badges.push({ label: 'Enabled', variant: 'green' });
        } else if (log.details?.includes('enabled = false')) {
          badges.push({ label: 'Disabled', variant: 'gray' });
        }
      } else if (log.action === 'SIDEBAR_UPDATE') {
        displayTarget = {
          title: `Role: ${log.target || 'N/A'}`,
          subtitle: 'Navigation Sidebar',
          type: 'ROLE',
        };
        simpleSummary = `Updated sidebar navigation layout for ${log.target || 'role'}`;
      } else if (log.action === 'PERMISSIONS_UPDATE') {
        displayTarget = {
          title: `Role: ${log.target || 'N/A'}`,
          subtitle: 'Role Permissions',
          type: 'ROLE',
        };
        simpleSummary = `Updated access control permissions for ${log.target || 'role'}`;
      } else if (log.action === 'USER_CREATE' || log.action === 'USER_UPDATE') {
        displayTarget = {
          title: log.target || 'User Account',
          subtitle: 'User Profile',
          type: 'USER',
        };
        simpleSummary =
          log.details || (log.action === 'USER_CREATE' ? 'Created new user account' : 'Updated user account');
      } else if (parsedJson) {
        // Fallback for any other JSON log
        simpleSummary = `Structured action completed (${Object.keys(parsedJson).length} fields)`;
        Object.entries(parsedJson)
          .slice(0, 3)
          .forEach(([k, v]) => {
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
              badges.push({ label: `${k}: ${v}`, variant: 'gray' });
            }
          });
      }

      return {
        ...log,
        displayTarget,
        simpleSummary,
        badges,
        parsedDetails: parsedJson,
      };
    });

    return NextResponse.json({ data: enrichedLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

