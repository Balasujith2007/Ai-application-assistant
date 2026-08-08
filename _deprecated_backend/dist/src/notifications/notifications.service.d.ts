import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, title: string, message: string, link?: string): Promise<{
        id: string;
        createdAt: Date;
        link: string | null;
        userId: string;
        title: string;
        message: string;
        isRead: boolean;
    }>;
    findAll(userId: string): Promise<{
        id: string;
        createdAt: Date;
        link: string | null;
        userId: string;
        title: string;
        message: string;
        isRead: boolean;
    }[]>;
    markRead(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        link: string | null;
        userId: string;
        title: string;
        message: string;
        isRead: boolean;
    }>;
    remove(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        link: string | null;
        userId: string;
        title: string;
        message: string;
        isRead: boolean;
    }>;
    private verifyOwnership;
}
