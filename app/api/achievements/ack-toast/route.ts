import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { badgeEngine } from '@/lib/gamification/badgeEngine';

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { badgeId } = await req.json();
    if (badgeId) {
      await badgeEngine.acknowledgeBadgeToast(userId, badgeId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
