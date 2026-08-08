import { PrismaService } from '../prisma/prisma.service';
export declare class ActivityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createActivity(userId: string, title: string, type: string, metadata?: any): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        title: string;
        type: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    getRecentActivity(userId: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        title: string;
        type: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
}
