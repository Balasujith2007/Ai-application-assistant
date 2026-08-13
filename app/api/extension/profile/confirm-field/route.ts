import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import { confirmField } from '@/lib/applyAgent/confirmField';
import { getUserIdFromJwtOrSession } from '@/lib/applyAgent/sessionAuth';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

export async function POST(req: Request) {
  const body = await req.json();
  const userId = await getUserIdFromJwtOrSession(req, body);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);

  if (!body.label || body.value == null) {
    return jsonWithCors(req, { success: false, message: 'label and value are required' }, 400);
  }

  const result = await confirmField(userId, {
    key: body.key,
    label: body.label,
    value: String(body.value),
    category: body.category,
    saveMode: body.saveMode === 'USE_ONCE' ? 'USE_ONCE' : 'SAVE',
    classification: body.classification,
    fieldPattern: body.fieldPattern,
    siteHost: body.siteHost,
    forceUpdate: !!body.forceUpdate,
    sessionToken: body.sessionToken,
    opportunityId: body.opportunityId,
  });

  return jsonWithCors(req, result, result.conflict ? 409 : result.ok ? 200 : 400);
}
