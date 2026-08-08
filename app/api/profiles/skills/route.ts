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
    const skillName = body.name || '';
    if (!skillName) return NextResponse.json({ message: 'Skill name required' }, { status: 400 });
    
    const skill = await prisma.skill.upsert({
      where: { name: skillName.trim().toLowerCase() },
      create: { name: skillName.trim().toLowerCase() },
      update: {},
    });

    await prisma.profileSkill.upsert({
      where: { profileId_skillId: { profileId: profile.id, skillId: skill.id } },
      create: { profileId: profile.id, skillId: skill.id },
      update: {},
    });

    return NextResponse.json({ data: skill });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}

