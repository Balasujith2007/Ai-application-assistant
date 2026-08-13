import { getUserIdFromRequest } from '@/lib/serverAuth';
import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import prisma from '@/lib/prisma';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  const body = await req.json();
  const sessionToken = body.sessionToken as string | undefined;

  if (!sessionToken) return jsonWithCors(req, { success: false, message: 'sessionToken required' }, 400);

  const session = await prisma.autofillSession.findUnique({ where: { sessionToken } });
  if (!session) return jsonWithCors(req, { success: false, message: 'Session not found' }, 404);
  if (userId && session.studentId !== userId) {
    return jsonWithCors(req, { success: false, message: 'Forbidden' }, 403);
  }

  const updated = await prisma.autofillSession.update({
    where: { sessionToken },
    data: {
      status: body.status || session.status,
      fieldsDetected: typeof body.fieldsDetected === 'number' ? body.fieldsDetected : session.fieldsDetected,
      fieldsFilled: typeof body.fieldsFilled === 'number' ? body.fieldsFilled : session.fieldsFilled,
      newFieldsSaved: typeof body.newFieldsSaved === 'number' ? body.newFieldsSaved : session.newFieldsSaved,
      pauseReason: body.pauseReason ?? session.pauseReason,
      report: body.report ?? session.report,
    },
  });

  return jsonWithCors(req, { success: true, session: updated });
}
