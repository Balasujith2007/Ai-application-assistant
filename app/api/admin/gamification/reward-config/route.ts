import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';
import {
  getRewardConfig,
  saveRewardConfig,
  getRewardConfigHistory,
  DEFAULT_REWARD_CONFIG,
  RewardConfigValidationError,
  type RewardEngineConfig,
} from '@/lib/gamification/rewardConfigService';

/**
 * GET /api/admin/gamification/reward-config
 * Returns the effective (persisted) reward configuration, the built-in
 * defaults and the recent change history. Admin-only.
 */
export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Gamification', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const [config, history] = await Promise.all([
      getRewardConfig(true),
      getRewardConfigHistory(25),
    ]);

    return NextResponse.json({
      success: true,
      config,
      defaults: DEFAULT_REWARD_CONFIG,
      history,
    });
  } catch (error) {
    console.error('Error fetching reward configuration:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/gamification/reward-config
 * Validates and persists the reward configuration. The reward engine reads the
 * persisted values on its next allocation, so saved changes take effect without
 * a redeploy. Admin-only; validation failures return 400 with a reason.
 */
export async function PUT(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Gamification', 'EDIT');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const body = (await req.json()) as Partial<RewardEngineConfig>;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid configuration payload' }, { status: 400 });
    }

    let saved: RewardEngineConfig;
    try {
      saved = await saveRewardConfig(body as RewardEngineConfig, auth.user!.id);
    } catch (error) {
      if (error instanceof RewardConfigValidationError) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }
      throw error;
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.user!.id,
        action: 'REWARD_CONFIG_UPDATE',
        target: 'reward-configuration',
        details: `Updated reward configuration sections: ${Object.keys(body).join(', ') || 'none'}`,
      },
    });

    return NextResponse.json({ success: true, config: saved });
  } catch (error) {
    console.error('Error saving reward configuration:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
