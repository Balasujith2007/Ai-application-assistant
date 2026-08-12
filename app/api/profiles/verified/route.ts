import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: true, verifiedProfiles: [] }, { status: 200 });
    }

    const verifiedProfiles = await prisma.verifiedProfile.findMany({
      where: { studentId: userId }
    });

    return NextResponse.json({ success: true, verifiedProfiles });
  } catch (error) {
    console.error('Error fetching verified profiles:', error);
    return NextResponse.json({ success: true, verifiedProfiles: [] }, { status: 200 });
  }
}
