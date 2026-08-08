import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';


export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    let profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) profile = await prisma.profile.create({ data: { userId } });
    const body = await req.json();
    const project = await prisma.project.create({ data: { profileId: profile.id, ...body } });
    return NextResponse.json({ data: project });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}

