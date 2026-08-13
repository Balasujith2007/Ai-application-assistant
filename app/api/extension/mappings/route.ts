import { getUserIdFromRequest } from '@/lib/serverAuth';
import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import prisma from '@/lib/prisma';
import { normalizeLabel } from '@/lib/applyAgent/classifier';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);

  const mappings = await prisma.fieldMappingMemory.findMany({
    where: { OR: [{ userId }, { userId: '' }] },
    orderBy: { updatedAt: 'desc' },
  });

  return jsonWithCors(req, { success: true, mappings });
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);

  const body = await req.json();
  const fieldPattern = normalizeLabel(body.fieldPattern || body.label || '');
  const mappedField = String(body.mappedField || '');
  if (!fieldPattern || !mappedField) {
    return jsonWithCors(req, { success: false, message: 'fieldPattern and mappedField are required' }, 400);
  }

  const mapping = await prisma.fieldMappingMemory.upsert({
    where: {
      userId_fieldPattern_siteHost: {
        userId,
        fieldPattern,
        siteHost: body.siteHost || '',
      },
    },
    create: {
      userId,
      fieldPattern,
      mappedField,
      confidence: typeof body.confidence === 'number' ? body.confidence : 0.9,
      verified: body.verified !== false,
      siteHost: body.siteHost || '',
    },
    update: {
      mappedField,
      confidence: typeof body.confidence === 'number' ? body.confidence : 0.9,
      verified: body.verified !== false,
    },
  });

  return jsonWithCors(req, { success: true, mapping });
}
