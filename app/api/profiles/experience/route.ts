import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { recordCareerActivity } from '@/lib/gamification/badgeTriggers';


export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    let profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) profile = await prisma.profile.create({ data: { userId } });
    const body = await req.json();
    const { company, role, description, startDate, endDate, currentlyWorking, duration } = body;
    const exp = await prisma.experience.create({
      data: {
        profileId: profile.id,
        company,
        role,
        description: description || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: currentlyWorking || !endDate ? null : new Date(endDate),
        currentlyWorking: Boolean(currentlyWorking),
        duration: duration || null,
      },
    });

    // Career-growth trigger: adding experience is a qualifying career activity.
    await recordCareerActivity(userId, 'EXPERIENCE_ADDED', `experience:${exp.id}`);

    return NextResponse.json({ data: exp });
  } catch (error) {
    console.error('Experience create error:', error);
    return NextResponse.json({ message: 'Error creating experience' }, { status: 500 });
  }
}

