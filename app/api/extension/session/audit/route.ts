import { getUserIdFromJwtOrSession } from '@/lib/applyAgent/sessionAuth';
import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import { sanitizeAuditEvent, AuditEventInput } from '@/lib/applyAgent/auditSanitize';
import prisma from '@/lib/prisma';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId = await getUserIdFromJwtOrSession(req, body);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);

  const incoming: AuditEventInput[] = Array.isArray(body.events) ? body.events : [];
  const domain = String(body.domain || '').slice(0, 200);
  const sessionToken = body.sessionToken ? String(body.sessionToken).slice(0, 80) : null;

  const rows = incoming
    .map((e) => sanitizeAuditEvent({ ...e, domain: e.domain || domain, sessionToken: e.sessionToken || sessionToken || undefined }))
    .filter((e): e is NonNullable<typeof e> => !!e)
    .slice(0, 100);

  if (!rows.length) return jsonWithCors(req, { success: true, stored: 0 });

  await prisma.autofillAuditEvent.createMany({
    data: rows.map((e) => ({
      userId,
      sessionToken,
      domain: e.domain || domain || 'unknown',
      status: e.status,
      fieldKey: e.fieldKey || null,
      fieldLabel: e.fieldLabel || null,
      detail: e.detail || null,
    })),
  });

  return jsonWithCors(req, { success: true, stored: rows.length });
}
