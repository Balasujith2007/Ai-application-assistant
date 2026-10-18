import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized', data: [] }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10, // Dropdown shows max 10; full list is on /dashboard/notifications
    });

    const response = NextResponse.json({ success: true, data: notifications });
    // Cache for 30s to avoid hammering DB on every page focus/render
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error: any) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error', data: [], error: String(error) }, { status: 200 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('PUT /api/notifications error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error', error: String(error) }, { status: 200 });
  }
}
