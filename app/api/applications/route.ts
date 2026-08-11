import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { ApplicationStatus, ApplicationType } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as ApplicationType | null;
    const status = searchParams.get('status') as ApplicationStatus | null;
    const search = searchParams.get('search');

    const where: any = { userId };
    if (type) where.applicationType = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } }
      ];
    }

    const applications = await prisma.application.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { githubUrl, codolioUrl, companyName, position } = body;

    if (!companyName || !position) {
      return NextResponse.json({ message: 'Company name and position are required.' }, { status: 400 });
    }

    if (!githubUrl || typeof githubUrl !== 'string' || !githubUrl.trim()) {
      return NextResponse.json({ message: 'GitHub profile URL is required.' }, { status: 400 });
    }

    if (!codolioUrl || typeof codolioUrl !== 'string' || !codolioUrl.trim()) {
      return NextResponse.json({ message: 'Codolio profile URL is required.' }, { status: 400 });
    }

    let normGithub = githubUrl.trim();
    try {
      const gUrl = new URL(normGithub);
      const gHost = gUrl.hostname.toLowerCase();
      if (gHost !== 'github.com' && gHost !== 'www.github.com') {
        return NextResponse.json({ message: 'Please enter a valid GitHub profile URL.' }, { status: 400 });
      }
      const parts = gUrl.pathname.split('/').filter(Boolean);
      if (parts.length === 0) {
        return NextResponse.json({ message: 'Please enter a valid GitHub profile URL.' }, { status: 400 });
      }
      normGithub = `https://github.com/${parts[0]}`;
    } catch {
      return NextResponse.json({ message: 'Please enter a valid GitHub profile URL.' }, { status: 400 });
    }

    let normCodolio = codolioUrl.trim();
    try {
      const cUrl = new URL(normCodolio);
      const cHost = cUrl.hostname.toLowerCase();
      if (cHost !== 'codolio.com' && cHost !== 'www.codolio.com') {
        return NextResponse.json({ message: 'Please enter a valid Codolio profile URL.' }, { status: 400 });
      }
      const parts = cUrl.pathname.split('/').filter(Boolean);
      let user = '';
      if (parts[0] === 'profile' && parts[1]) user = parts[1];
      else if (parts.length === 1) user = parts[0];
      if (!user) {
        return NextResponse.json({ message: 'Please enter a valid Codolio profile URL.' }, { status: 400 });
      }
      normCodolio = `https://codolio.com/profile/${user}`;
    } catch {
      return NextResponse.json({ message: 'Please enter a valid Codolio profile URL.' }, { status: 400 });
    }

    const application = await prisma.application.create({
      data: {
        ...body,
        githubUrl: normGithub,
        codolioUrl: normCodolio,
        userId,
      }
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
