import { getUserIdFromRequest } from '@/lib/serverAuth';
import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import prisma from '@/lib/prisma';
import { confirmField } from '@/lib/applyAgent/confirmField';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);

  const fields = await prisma.customProfileField.findMany({
    where: { userId },
    include: { history: { orderBy: { createdAt: 'desc' }, take: 10 } },
    orderBy: { updatedAt: 'desc' },
  });

  return jsonWithCors(req, { success: true, fields });
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);

  const body = await req.json();
  const result = await confirmField(userId, {
    key: body.key,
    label: body.label,
    value: body.value,
    category: body.category,
    saveMode: body.saveMode === 'USE_ONCE' ? 'USE_ONCE' : 'SAVE',
    classification: body.classification,
    fieldPattern: body.fieldPattern,
    siteHost: body.siteHost,
    forceUpdate: !!body.forceUpdate,
    sessionToken: body.sessionToken,
    opportunityId: body.opportunityId,
  });

  const status = result.conflict ? 409 : result.ok ? 200 : 400;
  return jsonWithCors(req, result, status);
}
