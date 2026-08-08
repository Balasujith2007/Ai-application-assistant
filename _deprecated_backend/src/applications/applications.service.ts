import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationType, ApplicationStatus } from '@prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateApplicationDto) {
    return this.prisma.application.create({
      data: { userId, ...dto },
    });
  }

  async findAll(
    userId: string,
    filters: {
      type?: ApplicationType;
      status?: ApplicationStatus;
      search?: string;
    },
  ) {
    return this.prisma.application.findMany({
      where: {
        userId,
        ...(filters.type && { applicationType: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && {
          OR: [
            { companyName: { contains: filters.search, mode: 'insensitive' } },
            { position: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, userId },
    });

    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async update(userId: string, id: string, dto: UpdateApplicationDto) {
    await this.verifyOwnership(userId, id);
    return this.prisma.application.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.verifyOwnership(userId, id);
    return this.prisma.application.delete({ where: { id } });
  }

  async getStats(userId: string) {
    const [total, active, interviews, selected, hackathons] = await Promise.all([
      this.prisma.application.count({ where: { userId } }),
      this.prisma.application.count({
        where: {
          userId,
          status: { in: ['APPLIED', 'SHORTLISTED'] },
        },
      }),
      this.prisma.application.count({
        where: { userId, status: 'INTERVIEW' },
      }),
      this.prisma.application.count({
        where: { userId, status: 'SELECTED' },
      }),
      this.prisma.application.count({
        where: { userId, applicationType: 'HACKATHON' },
      }),
    ]);

    return { total, active, interviews, selected, hackathons };
  }

  async getUpcomingDeadlines(userId: string) {
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    return this.prisma.application.findMany({
      where: {
        userId,
        deadline: {
          gte: now,
          lte: twoWeeksLater,
        },
        status: { notIn: ['REJECTED', 'WITHDRAWN', 'SELECTED'] },
      },
      orderBy: { deadline: 'asc' },
      take: 5,
    });
  }

  private async verifyOwnership(userId: string, id: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, userId },
    });
    if (!app) throw new ForbiddenException('Not authorized');
  }
}
