import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const activeResume = await prisma.resume.findFirst({
      where: {
        userId,
        isActive: true
      },
      orderBy: { uploadedAt: 'desc' }
    });

    if (!activeResume) {
      return NextResponse.json({
        success: true,
        resume: null,
        message: 'No active resume found.'
      });
    }

    return NextResponse.json({
      success: true,
      resume: activeResume
    });
  } catch (error) {
    console.error('Error fetching active resume:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch active resume.' }, { status: 500 });
  }
}
