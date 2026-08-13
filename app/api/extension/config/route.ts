import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

export async function GET(req: Request) {
  return jsonWithCors(req, {
    success: true,
    apiBase: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    appName: 'CareerAI Apply Agent',
    policies: {
      neverAutoSubmit: true,
      neverBypassCaptcha: true,
      neverInventAnswers: true,
      requireSaveConsent: true,
    },
  });
}
