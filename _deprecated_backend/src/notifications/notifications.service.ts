import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, title: string, message: string, link?: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        link,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(userId: string, id: string) {
    await this.verifyOwnership(userId, id);
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.verifyOwnership(userId, id);
    return this.prisma.notification.delete({ where: { id } });
  }

  private async verifyOwnership(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new ForbiddenException('Not authorized');
    return notification;
  }
}
