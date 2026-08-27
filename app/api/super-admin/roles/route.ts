import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Roles & Permissions', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    if (!role) {
      return NextResponse.json({ message: 'Role is required' }, { status: 400 });
    }

    const permissions = await prisma.rolePermission.findMany({
      where: { role: role as any }
    });

    return NextResponse.json({ data: permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Roles & Permissions', 'EDIT');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { role, permissions } = body; // Array of { resource, action, allowed }

    if (!role || !Array.isArray(permissions)) {
      return NextResponse.json({ message: 'Role and permissions array are required' }, { status: 400 });
    }

    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_resource_action: {
            role: role as any,
            resource: perm.resource,
            action: perm.action
          }
        },
        update: { allowed: perm.allowed },
        create: {
          role: role as any,
          resource: perm.resource,
          action: perm.action,
          allowed: perm.allowed
        }
      });
    }

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: auth.user!.id,
        action: 'PERMISSIONS_UPDATE',
        target: role,
        details: `Updated permissions matrix for role ${role}. Modified ${permissions.length} items.`,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
