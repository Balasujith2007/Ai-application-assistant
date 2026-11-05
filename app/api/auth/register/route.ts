import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { signToken } from '@/lib/serverAuth';
import { applyRateLimit } from '@/lib/security/rateLimit';
import { validateEmail, validatePassword, validateString, validateEnum, validatePayloadSize } from '@/lib/security/validation';
import { ValidationError, ConflictError, handleApiError } from '@/lib/security/errorHandler';

const ALLOWED_ROLES = ['STUDENT', 'MENTOR', 'FACULTY', 'HOD', 'PLACEMENT_CELL', 'ADMIN', 'SUPER_ADMIN'] as const;

export async function POST(req: Request) {
  // Apply rate limiting to register endpoint
  const rateLimitResult = applyRateLimit(req, 'auth');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: rateLimitResult.error },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        }
      }
    );
  }

  try {
    const body = await req.json();
    
    // Validate payload size
    const sizeCheck = validatePayloadSize(body, 10); // 10KB max
    if (!sizeCheck.valid) {
      throw new ValidationError(sizeCheck.error);
    }

    const { name, email, password, role = 'STUDENT', department, employeeId } = body;

    // Validate email
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      throw new ValidationError(emailCheck.error);
    }

    // Validate password
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      throw new ValidationError(passwordCheck.error);
    }

    // Validate name
    const nameCheck = validateString(name, 'Name', 2, 100);
    if (!nameCheck.valid) {
      throw new ValidationError(nameCheck.error);
    }

    // Validate role if provided
    if (role && role !== 'STUDENT') {
      const roleCheck = validateEnum(role, ALLOWED_ROLES, 'Role');
      if (!roleCheck.valid) {
        throw new ValidationError(roleCheck.error);
      }
    }

    // Sanitize inputs
    const sanitizedName = name.trim().slice(0, 100);
    const sanitizedEmail = email.trim().toLowerCase().slice(0, 255);
    const sanitizedDepartment = department ? department.trim().slice(0, 100) : null;
    const sanitizedEmployeeId = employeeId ? employeeId.trim().slice(0, 50) : null;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        email: sanitizedEmail,
        password: hashedPassword,
        role,
        profile: {
          create: {
            department: sanitizedDepartment || undefined,
            employeeId: sanitizedEmployeeId || undefined,
          } as any
        }
      },
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });

    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      success: true,
      data: {
        token: token,
        user: userWithoutPassword,
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
