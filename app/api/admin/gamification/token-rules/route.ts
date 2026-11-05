import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/gamification/adminGuard';
import {
  getTokenRules,
  saveTokenRules,
  DEFAULT_TOKEN_RULES,
  TokenRulesValidationError,
  type TokenRulesConfig,
} from '@/lib/gamification/tokenConfig';

/**
 * GET /api/admin/gamification/token-rules — effective token rules + defaults.
 * PUT /api/admin/gamification/token-rules — validate, persist and audit the rules.
 * Super Admin only.
 */
export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const rules = await getTokenRules(true);
  return NextResponse.json({ success: true, rules, defaults: DEFAULT_TOKEN_RULES });
}

export async function PUT(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as Partial<TokenRulesConfig>;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: 'Invalid payload.' }, { status: 400 });
  }

  let saved: TokenRulesConfig;
  try {
    saved = await saveTokenRules(body, auth.userId);
  } catch (error) {
    if (error instanceof TokenRulesValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      userId: auth.userId,
      action: 'TOKEN_RULES_UPDATE',
      target: 'token-rules',
      details: `Updated token rules: streakRescue.enabled=${saved.streakRescue.enabled}, windowDays=${saved.streakRescue.windowDays}, leaderboardBoost.enabled=${saved.leaderboardBoost.enabled}.`,
    },
  });

  return NextResponse.json({ success: true, rules: saved });
}
