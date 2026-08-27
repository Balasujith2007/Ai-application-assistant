import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { checkAuthAndPermission } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'User Management', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'ALL';
    const department = searchParams.get('department') || 'ALL';
    const status = searchParams.get('status') || 'ALL';

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role !== 'ALL') {
      whereClause.role = role as any;
    }

    if (department !== 'ALL') {
      whereClause.profile = {
        department: { equals: department, mode: 'insensitive' }
      };
    }

    if (status !== 'ALL') {
      whereClause.active = status === 'ACTIVE';
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        profile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Remove passwords before sending to frontend
    const sanitized = users.map(({ password: _, ...user }) => user);

    return NextResponse.json({ data: sanitized });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'User Management', 'CREATE');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { name, email, password, role, department } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: 'Required fields missing' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any,
        profile: {
          create: {
            department: department || undefined
          }
        }
      }
    });

    // Log the event
    await prisma.auditLog.create({
      data: {
        userId: auth.user!.id,
        action: 'USER_CREATE',
        target: newUser.role,
        details: `Created user ${newUser.name} (${newUser.email}) with role ${newUser.role}`,
      }
    });

    const { password: _, ...sanitized } = newUser;
    return NextResponse.json({ data: sanitized }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'User Management', 'EDIT');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { id, role, active, name, email, department, password } = body;

    if (!id) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (role) updateData.role = role as any;
    if (active !== undefined) updateData.active = active;
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    if (department) {
      await prisma.profile.upsert({
        where: { userId: id },
        update: { department },
        create: { userId: id, department }
      });
    }

    // Log the event
    await prisma.auditLog.create({
      data: {
        userId: auth.user!.id,
        action: 'USER_UPDATE',
        target: updatedUser.role,
        details: `Updated user ${updatedUser.name} (${updatedUser.email}) properties: ${Object.keys(updateData).join(', ')}`,
      }
    });

    const { password: _, ...sanitized } = updatedUser;
    return NextResponse.json({ data: sanitized });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
