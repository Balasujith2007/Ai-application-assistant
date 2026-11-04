import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { getCoinBalance, getCoinHistory } from '@/lib/gamification/coinLedger';
import prisma from '@/lib/prisma';

/**
 * GET /api/coins
 * Returns the authenticated student's persisted coin balance and recent ledger entries.
 * The balance is always read from the database — never from the client.
 */
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, message: 'User not found or deactivated' },
        { status: 403 }
      );
    }

    const [balance, transactions] = await Promise.all([
      getCoinBalance(userId),
      getCoinHistory(userId, 20),
    ]);

    return NextResponse.json({ success: true, balance, transactions });
  } catch (error: any) {
    console.error('Error fetching coin balance:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch coin balance' },
      { status: 500 }
    );
  }
}
