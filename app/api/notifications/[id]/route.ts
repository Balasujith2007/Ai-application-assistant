import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';


export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const id = (await props.params).id;

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return NextResponse.json({ data: notification });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}

