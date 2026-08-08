import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ message: 'File is required' }, { status: 400 });
    }

    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.name) || '';
    const fileName = `${uniqueId}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    await prisma.resume.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const fileUrl = `/uploads/resumes/${fileName}`;

    const resume = await prisma.resume.create({
      data: {
        userId,
        fileName,
        fileUrl,
        originalName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        isActive: true,
      },
    });

    return NextResponse.json({ data: resume });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
