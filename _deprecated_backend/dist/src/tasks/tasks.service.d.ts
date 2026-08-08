import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
export declare class TasksService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateTaskDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        deadline: Date | null;
        category: import("@prisma/client").$Enums.TaskCategory;
        priority: import("@prisma/client").$Enums.TaskPriority;
        isCompleted: boolean;
    }>;
    findAll(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        deadline: Date | null;
        category: import("@prisma/client").$Enums.TaskCategory;
        priority: import("@prisma/client").$Enums.TaskPriority;
        isCompleted: boolean;
    }[]>;
    update(userId: string, id: string, dto: UpdateTaskDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        deadline: Date | null;
        category: import("@prisma/client").$Enums.TaskCategory;
        priority: import("@prisma/client").$Enums.TaskPriority;
        isCompleted: boolean;
    }>;
    remove(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        deadline: Date | null;
        category: import("@prisma/client").$Enums.TaskCategory;
        priority: import("@prisma/client").$Enums.TaskPriority;
        isCompleted: boolean;
    }>;
    toggleComplete(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        deadline: Date | null;
        category: import("@prisma/client").$Enums.TaskCategory;
        priority: import("@prisma/client").$Enums.TaskPriority;
        isCompleted: boolean;
    }>;
    private verifyOwnership;
}
