import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const task = await prisma.task.findUnique({
      where: { id: (await props.params).id, userId }
    });

    if (!task) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const updatedTask = await prisma.task.update({
      where: { id: (await props.params).id },
      data: { isCompleted: !task.isCompleted }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
