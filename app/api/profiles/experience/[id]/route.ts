import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';


export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
    const id = (await props.params).id;
    const existing = await prisma.experience.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) return NextResponse.json({ message: 'Record not found or access denied' }, { status: 404 });
    const body = await req.json();
    const updated = await prisma.experience.update({ where: { id }, data: body });
    return NextResponse.json({ data: updated });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
    const id = (await props.params).id;
    const existing = await prisma.experience.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) return NextResponse.json({ message: 'Record not found or access denied' }, { status: 404 });
    await prisma.experience.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}

