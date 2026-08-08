import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';


export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    return NextResponse.json({ data: user });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}

export async function PUT(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    const updateData: any = {};
    if (body.notificationPreferences !== undefined) updateData.notificationPreferences = body.notificationPreferences;
    if (body.privacySettings !== undefined) updateData.privacySettings = body.privacySettings;
    if (body.aiPreferences !== undefined) updateData.aiPreferences = body.aiPreferences;
    if (body.name !== undefined) updateData.name = body.name;

    let user = null;
    if (Object.keys(updateData).length > 0) {
      user = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    } else {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }

    if (body.careerPreferences !== undefined) {
      let profile = await prisma.profile.findUnique({ where: { userId } });
      if (profile) {
        await prisma.profile.update({
          where: { userId },
          data: { careerPreferences: body.careerPreferences } as any
        });
      }
    }

    return NextResponse.json({ data: user });
  } catch (error) { 
    console.error('Settings API Error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 }); 
  }
}

