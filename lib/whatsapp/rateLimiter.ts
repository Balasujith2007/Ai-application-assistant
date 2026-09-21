import prisma from '@/lib/prisma';

export interface RateLimitCheckResult {
  allowed: boolean;
  dailyCount: number;
  dailyLimit: number;
  monthlyCount: number;
  monthlyLimit: number;
  reason?: string;
}

/**
 * Checks whether current real WhatsApp deliveries are within daily and monthly safety limits.
 * Counts only real deliveries (status = 'SENT' or 'DELIVERED', provider = 'twilio').
 * Mocked and skipped messages do NOT consume limits.
 */
export async function checkWhatsAppRateLimits(): Promise<RateLimitCheckResult> {
  const dailyLimit = parseInt(process.env.WHATSAPP_DAILY_LIMIT || '10', 10);
  const monthlyLimit = parseInt(process.env.WHATSAPP_MONTHLY_LIMIT || '100', 10);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  try {
    const [dailyCount, monthlyCount] = await Promise.all([
      prisma.notificationDelivery.count({
        where: {
          provider: 'twilio',
          status: { in: ['SENT', 'DELIVERED'] },
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.notificationDelivery.count({
        where: {
          provider: 'twilio',
          status: { in: ['SENT', 'DELIVERED'] },
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    if (dailyCount >= dailyLimit) {
      return {
        allowed: false,
        dailyCount,
        dailyLimit,
        monthlyCount,
        monthlyLimit,
        reason: `Daily WhatsApp limit reached (${dailyCount}/${dailyLimit} messages sent today).`,
      };
    }

    if (monthlyCount >= monthlyLimit) {
      return {
        allowed: false,
        dailyCount,
        dailyLimit,
        monthlyCount,
        monthlyLimit,
        reason: `Monthly WhatsApp limit reached (${monthlyCount}/${monthlyLimit} messages sent this month).`,
      };
    }

    return {
      allowed: true,
      dailyCount,
      dailyLimit,
      monthlyCount,
      monthlyLimit,
    };
  } catch (error: any) {
    console.warn('[WhatsAppRateLimiter] Failed to query delivery counts, falling back to permissive mode:', error?.message || error);
    return {
      allowed: true,
      dailyCount: 0,
      dailyLimit,
      monthlyCount: 0,
      monthlyLimit,
    };
  }
}
