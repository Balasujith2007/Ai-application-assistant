import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';


export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    let profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        education: { orderBy: { startYear: 'desc' } },
        projects: { orderBy: { id: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        skills: { include: { skill: true } },
      },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: { userId },
        include: { education: true, projects: true, experiences: true, skills: { include: { skill: true } } },
      });
    }
    return NextResponse.json({ data: profile });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}

export async function PUT(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const updated = await prisma.profile.upsert({
      where: { userId },
      create: { userId, ...body },
      update: body,
    });
    return NextResponse.json({ data: updated });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}

