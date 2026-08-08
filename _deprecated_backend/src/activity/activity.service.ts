import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async createActivity(userId: string, title: string, type: string, metadata?: any) {
    return this.prisma.activity.create({
      data: {
        userId,
        title,
        type,
        metadata: metadata || {},
      },
    });
  }

  async getRecentActivity(userId: string, limit = 5) {
    return this.prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
