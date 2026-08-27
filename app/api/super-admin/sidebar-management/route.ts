import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Sidebar Management', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    if (!role) {
      return NextResponse.json({ message: 'Role is required' }, { status: 400 });
    }

    const items = await prisma.roleSidebarItem.findMany({
      where: { role: role as any },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error('Error fetching sidebar items:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Sidebar Management', 'EDIT');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { role, items } = body; // Array of { title, path, order, enabled }

    if (!role || !Array.isArray(items)) {
      return NextResponse.json({ message: 'Role and items array are required' }, { status: 400 });
    }

    // Upsert each item
    for (const item of items) {
      await prisma.roleSidebarItem.upsert({
        where: {
          role_title: {
            role: role as any,
            title: item.title
          }
        },
        update: {
          path: item.path,
          order: item.order,
          enabled: item.enabled
        },
        create: {
          role: role as any,
          title: item.title,
          path: item.path,
          order: item.order,
          enabled: item.enabled
        }
      });
    }

    // Log the event
    await prisma.auditLog.create({
      data: {
        userId: auth.user!.id,
        action: 'SIDEBAR_UPDATE',
        target: role,
        details: `Updated sidebar configuration for role ${role}. Reordered and configured ${items.length} links.`,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving sidebar items:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
