import { TaskCategory, TaskPriority } from '@prisma/client';
export declare class CreateTaskDto {
    title: string;
    category?: TaskCategory;
    priority?: TaskPriority;
    deadline?: string;
}
