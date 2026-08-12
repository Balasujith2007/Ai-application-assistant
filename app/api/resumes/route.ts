import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';

    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });

    const formatted = resumes.map((r) => ({
      ...r,
      fileUrl: `/api/resumes/${r.id}${tokenQuery}`,
    }));
    return NextResponse.json({ data: formatted });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
