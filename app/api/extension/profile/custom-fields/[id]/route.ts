import { getUserIdFromRequest } from '@/lib/serverAuth';
import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import prisma from '@/lib/prisma';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);
  const { id } = await params;

  const existing = await prisma.customProfileField.findFirst({ where: { id, userId } });
  if (!existing) return jsonWithCors(req, { success: false, message: 'Field not found' }, 404);

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.value === 'string') data.value = body.value.trim();
  if (typeof body.label === 'string') data.label = body.label;
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled;
  if (typeof body.fillPolicy === 'string') data.fillPolicy = body.fillPolicy;
  if (typeof body.category === 'string') data.category = body.category;

  const updated = await prisma.customProfileField.update({ where: { id }, data });

  if (typeof body.value === 'string' && body.value.trim() !== existing.value) {
    await prisma.profileFieldHistory.create({
      data: {
        fieldId: id,
        oldValue: existing.value,
        newValue: body.value.trim(),
        source: 'USER_ENTERED',
      },
    });
  }

  return jsonWithCors(req, { success: true, field: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);
  const { id } = await params;

  const existing = await prisma.customProfileField.findFirst({ where: { id, userId } });
  if (!existing) return jsonWithCors(req, { success: false, message: 'Field not found' }, 404);

  await prisma.customProfileField.delete({ where: { id } });
  return jsonWithCors(req, { success: true });
}
