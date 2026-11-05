import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/gamification/adminGuard';
import {
  getEffectiveBadgeCatalog,
  seedBadgeCatalog,
} from '@/lib/gamification/badgeCatalogService';
import { badgeEngine } from '@/lib/gamification/badgeEngine';

/**
 * Super Admin badge management.
 *
 * GET  /api/admin/gamification/badges            — effective catalog, categories,
 *                                                  streak milestones, monthly rules,
 *                                                  recent award audit trail.
 *      ?q=<term>                                  — search students (grant target).
 *      ?studentId=<id>                            — a student's awarded badges.
 * POST /api/admin/gamification/badges
 *      { action: 'seed' }                         — seed/refresh the catalog.
 *      { action: 'grant', studentId, badgeId, reason }
 *      { action: 'revoke', studentId, badgeId, reason }
 *
 * Only authenticated SUPER_ADMIN users may call this endpoint. Manual grants
 * and revocations always require a reason and are recorded in the audit trail.
 */

interface AuditRow {
  id: string;
  studentId: string;
  studentName: string | null;
  badgeId: string;
  action: string;
  source: string;
  reason: string;
  actorId: string | null;
  createdAt: Date;
}

export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const query = (url.searchParams.get('q') || '').trim();
  const studentId = (url.searchParams.get('studentId') || '').trim();

  try {
    const catalog = await getEffectiveBadgeCatalog(true);

    const categories = Array.from(new Set(catalog.map((b) => b.category))).map((category) => ({
      category,
      total: catalog.filter((b) => b.category === category).length,
      active: catalog.filter((b) => b.category === category && b.active).length,
    }));

    const streakMilestones = catalog
      .filter((b) => b.category === 'CONSISTENCY')
      .sort((a, b) => a.threshold - b.threshold)
      .map((b) => ({ badgeId: b.id, title: b.title, thresholdDays: b.threshold, unit: b.unit, active: b.active }));

    const monthlyRules = catalog
      .filter((b) => b.awardSource === 'MONTHLY')
      .map((b) => ({
        badgeId: b.id,
        title: b.title,
        threshold: b.threshold,
        xpReward: b.xpReward,
        monthlyRule: b.monthlyRule,
        active: b.active,
      }));

    let awardHistory: AuditRow[] = [];
    try {
      awardHistory = await prisma.$queryRawUnsafe<AuditRow[]>(
        `SELECT a.id, a."studentId", u.name AS "studentName", a."badgeId", a.action, a.source,
                a.reason, a."actorId", a."createdAt"
         FROM badge_award_audits a
         LEFT JOIN users u ON u.id = a."studentId"
         ORDER BY a."createdAt" DESC
         LIMIT 50`
      );
    } catch {
      // Audit table not migrated yet — return an empty trail rather than failing.
    }

    let students: Array<{ id: string; name: string; email: string }> = [];
    if (query) {
      students = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, email: true },
        take: 10,
      });
    }

    let studentBadges: unknown[] = [];
    if (studentId) {
      studentBadges = await badgeEngine.listStudentCredentials(studentId);
    }

    return NextResponse.json({
      success: true,
      catalog,
      categories,
      streakMilestones,
      monthlyRules,
      awardHistory: awardHistory.map((a) => ({
        id: a.id,
        studentId: a.studentId,
        studentName: a.studentName,
        badgeId: a.badgeId,
        action: a.action,
        source: a.source,
        reason: a.reason,
        actorId: a.actorId,
        createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : null,
      })),
      students,
      studentBadges,
    });
  } catch (error) {
    console.error('Error loading badge management data:', error);
    return NextResponse.json({ success: false, message: 'Failed to load badge catalog.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const action = String(body?.action || '').trim();

  if (action === 'seed') {
    const result = await seedBadgeCatalog(auth.userId);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to seed badge catalog.' },
        { status: 400 }
      );
    }
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        action: 'BADGE_CATALOG_SEED',
        target: 'badge-catalog',
        details: `Seeded/refreshed ${result.seeded} badge catalog entries.`,
      },
    });
    return NextResponse.json({ success: true, seeded: result.seeded });
  }

  if (action === 'grant' || action === 'revoke') {
    const studentId = String(body?.studentId || '').trim();
    const badgeId = String(body?.badgeId || '').trim();
    const reason = String(body?.reason || '').trim();

    if (!studentId || !badgeId) {
      return NextResponse.json(
        { success: false, message: 'studentId and badgeId are required.' },
        { status: 400 }
      );
    }
    if (!reason) {
      return NextResponse.json(
        { success: false, message: 'A reason is required for manual badge changes.' },
        { status: 400 }
      );
    }

    const student = await prisma.user.findUnique({ where: { id: studentId }, select: { id: true, name: true } });
    if (!student) {
      return NextResponse.json({ success: false, message: 'Student not found.' }, { status: 404 });
    }

    if (action === 'grant') {
      const result = await badgeEngine.awardBadgeOnBehalf({
        studentId,
        badgeId,
        source: 'MANUAL',
        reason,
        actorId: auth.userId,
      });
      if (!result.ok) {
        return NextResponse.json({ success: false, message: result.error || 'Grant failed.' }, { status: 400 });
      }
      await prisma.auditLog.create({
        data: {
          userId: auth.userId,
          action: 'BADGE_MANUAL_GRANT',
          target: studentId,
          details: `Manual grant of ${badgeId} to ${student.name}. Reason: ${reason}. AlreadyAwarded=${!result.awarded}`,
        },
      });
      return NextResponse.json({ success: true, awarded: result.awarded, credentialId: result.credentialId ?? null });
    }

    const result = await badgeEngine.revokeBadge({
      studentId,
      badgeId,
      reason,
      actorId: auth.userId,
      source: 'MANUAL',
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.error || 'Revoke failed.' }, { status: 400 });
    }
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        action: 'BADGE_MANUAL_REVOKE',
        target: studentId,
        details: `Credential revoked for ${badgeId} on ${student.name}. Reason: ${reason}`,
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, message: `Unsupported action: ${action || '(none)'}` }, { status: 400 });
}
