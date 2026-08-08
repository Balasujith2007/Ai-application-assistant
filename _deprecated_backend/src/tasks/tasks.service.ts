import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        userId,
        ...dto,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.task.findMany({
      where: { userId },
      orderBy: [
        { isCompleted: 'asc' },
        { priority: 'desc' },
        { deadline: 'asc' },
        { createdAt: 'desc' }
      ],
    });
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    await this.verifyOwnership(userId, id);
    return this.prisma.task.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.verifyOwnership(userId, id);
    return this.prisma.task.delete({ where: { id } });
  }

  async toggleComplete(userId: string, id: string) {
    const task = await this.verifyOwnership(userId, id);
    return this.prisma.task.update({
      where: { id },
      data: { isCompleted: !task.isCompleted },
    });
  }

  private async verifyOwnership(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });
    if (!task) throw new ForbiddenException('Not authorized to access this task');
    return task;
  }
}
