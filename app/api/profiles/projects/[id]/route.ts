import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';


export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const id = (await props.params).id;
    const body = await req.json();
    const updated = await prisma.project.update({ where: { id }, data: body });
    return NextResponse.json({ data: updated });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const id = (await props.params).id;
    await prisma.project.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}

