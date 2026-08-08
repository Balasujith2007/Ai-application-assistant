import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
interface AuthenticatedRequest extends Express.Request {
    user: {
        id: string;
    };
}
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(req: AuthenticatedRequest, createTaskDto: CreateTaskDto): Promise<{
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
    findAll(req: AuthenticatedRequest): Promise<{
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
    update(req: AuthenticatedRequest, id: string, updateTaskDto: UpdateTaskDto): Promise<{
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
    remove(req: AuthenticatedRequest, id: string): Promise<{
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
    toggleComplete(req: AuthenticatedRequest, id: string): Promise<{
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
}
export {};
