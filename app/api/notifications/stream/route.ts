import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { getNotificationEmitter, NotificationEvent } from '@/lib/notifications/eventBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return new NextResponse('Unauthorized: Valid authentication token required', { status: 401 });
    }

    const emitter = getNotificationEmitter();
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let eventHandler: ((event: NotificationEvent) => void) | null = null;
    let isClosed = false;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        const safeEnqueue = (payload: string) => {
          if (isClosed) return;
          try {
            controller.enqueue(encoder.encode(payload));
          } catch {
            cleanup();
          }
        };

        const cleanup = () => {
          if (isClosed) return;
          isClosed = true;
          if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }
          if (eventHandler) {
            emitter.off(`user:${userId}`, eventHandler);
            eventHandler = null;
          }
          try {
            controller.close();
          } catch {
            // Already closed
          }
        };

        // 1. Send initial connection confirmation
        safeEnqueue(`event: connected\ndata: ${JSON.stringify({ userId, connectedAt: new Date().toISOString() })}\n\n`);

        // 2. Real-time event listener for this authenticated user
        eventHandler = (event: NotificationEvent) => {
          safeEnqueue(`event: notification\ndata: ${JSON.stringify(event)}\n\n`);
        };

        emitter.on(`user:${userId}`, eventHandler);

        // 3. Keep-alive heartbeat every 20 seconds
        heartbeatTimer = setInterval(() => {
          safeEnqueue(`: heartbeat ${Date.now()}\n\n`);
        }, 20000);

        // 4. Abort listener if client disconnects
        if (req.signal) {
          req.signal.addEventListener('abort', cleanup);
        }
      },
      cancel() {
        isClosed = true;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (eventHandler) emitter.off(`user:${userId}`, eventHandler);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform, no-store',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('GET /api/notifications/stream error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
