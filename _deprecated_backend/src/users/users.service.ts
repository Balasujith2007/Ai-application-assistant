import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async getStats() {
    const [total, students, mentors, faculty, hodCount, placementCell, admins] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'STUDENT' } }),
        this.prisma.user.count({ where: { role: 'MENTOR' } }),
        this.prisma.user.count({ where: { role: 'FACULTY' } }),
        this.prisma.user.count({ where: { role: 'HOD' } }),
        this.prisma.user.count({ where: { role: 'PLACEMENT_CELL' } }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
      ]);

    return { total, students, mentors, faculty, hod: hodCount, placementCell, admins };
  }
}
