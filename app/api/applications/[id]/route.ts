import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const application = await prisma.application.findUnique({
      where: { id: (await props.params).id, userId }
    });

    if (!application) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(application);
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const updateData: any = { ...body };

    if (body.githubUrl) {
      try {
        const gUrl = new URL(body.githubUrl.trim());
        const gHost = gUrl.hostname.toLowerCase();
        if (gHost === 'github.com' || gHost === 'www.github.com') {
          const parts = gUrl.pathname.split('/').filter(Boolean);
          if (parts[0]) updateData.githubUrl = `https://github.com/${parts[0]}`;
        }
      } catch {}
    }

    if (body.codolioUrl) {
      try {
        const cUrl = new URL(body.codolioUrl.trim());
        const cHost = cUrl.hostname.toLowerCase();
        if (cHost === 'codolio.com' || cHost === 'www.codolio.com') {
          const parts = cUrl.pathname.split('/').filter(Boolean);
          let user = parts[0] === 'profile' ? parts[1] : parts[0];
          if (user) updateData.codolioUrl = `https://codolio.com/profile/${user}`;
        }
      } catch {}
    }

    const application = await prisma.application.update({
      where: { id: (await props.params).id, userId },
      data: updateData
    });

    return NextResponse.json(application);
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await prisma.application.delete({
      where: { id: (await props.params).id, userId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
