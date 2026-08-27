import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Feature Management', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const features = await prisma.appFeature.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ data: features });
  } catch (error) {
    console.error('Error fetching app features:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Feature Management', 'EDIT');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { name, enabled, roles } = body;

    if (!name) {
      return NextResponse.json({ message: 'Feature name is required' }, { status: 400 });
    }

    const updatedFeature = await prisma.appFeature.update({
      where: { name },
      data: {
        enabled: enabled !== undefined ? enabled : undefined,
        roles: roles ? roles : undefined
      }
    });

    // Log the event
    await prisma.auditLog.create({
      data: {
        userId: auth.user!.id,
        action: 'FEATURE_UPDATE',
        target: name,
        details: `Updated feature ${name}: enabled = ${updatedFeature.enabled}, roles = [${updatedFeature.roles.join(', ')}]`,
      }
    });

    return NextResponse.json({ data: updatedFeature });
  } catch (error) {
    console.error('Error updating feature:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
