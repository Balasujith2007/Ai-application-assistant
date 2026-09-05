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
    const { company, role, description, startDate, endDate, currentlyWorking, duration } = body;
    const updated = await prisma.experience.update({
      where: { id },
      data: {
        company: company !== undefined ? company : existing.company,
        role: role !== undefined ? role : existing.role,
        description: description !== undefined ? description : existing.description,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: currentlyWorking ? null : (endDate ? new Date(endDate) : (currentlyWorking !== undefined ? null : existing.endDate)),
        currentlyWorking: currentlyWorking !== undefined ? Boolean(currentlyWorking) : existing.currentlyWorking,
        duration: duration !== undefined ? duration : existing.duration,
      },
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Experience update error:', error);
    return NextResponse.json({ message: 'Error updating experience' }, { status: 500 });
  }
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

