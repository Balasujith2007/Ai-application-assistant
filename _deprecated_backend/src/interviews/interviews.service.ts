import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateInterviewDto) {
    return this.prisma.interview.create({
      data: {
        userId,
        ...dto,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.interview.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });
  }

  async update(userId: string, id: string, dto: UpdateInterviewDto) {
    await this.verifyOwnership(userId, id);
    return this.prisma.interview.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.verifyOwnership(userId, id);
    return this.prisma.interview.delete({ where: { id } });
  }

  private async verifyOwnership(userId: string, id: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { id, userId },
    });
    if (!interview) throw new ForbiddenException('Not authorized');
    return interview;
  }
}
