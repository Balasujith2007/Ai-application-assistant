import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ResumesService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadResume(
    userId: string,
    file: Express.Multer.File,
  ) {
    // Deactivate all previous resumes for this user
    await this.prisma.resume.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // For Phase 1, store the file locally; in Phase 2 replace with S3/Cloudinary
    const fileUrl = `/uploads/resumes/${file.filename}`;

    const resume = await this.prisma.resume.create({
      data: {
        userId,
        fileName: file.filename,
        fileUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        isActive: true,
      },
    });

    return resume;
  }

  async getMyResumes(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getActiveResume(userId: string) {
    return this.prisma.resume.findFirst({
      where: { userId, isActive: true },
    });
  }

  async deleteResume(userId: string, resumeId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Delete local file if it exists
    const filePath = path.join(process.cwd(), 'uploads', 'resumes', resume.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return this.prisma.resume.delete({ where: { id: resumeId } });
  }

  async setActive(userId: string, resumeId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });

    if (!resume) throw new NotFoundException('Resume not found');

    await this.prisma.resume.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.resume.update({
      where: { id: resumeId },
      data: { isActive: true },
    });
  }
}
