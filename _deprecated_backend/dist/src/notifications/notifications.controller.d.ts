import { NotificationsService } from './notifications.service';
interface AuthenticatedRequest extends Express.Request {
    user: {
        id: string;
    };
}
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(req: AuthenticatedRequest): Promise<{
        id: string;
        createdAt: Date;
        link: string | null;
        userId: string;
        title: string;
        message: string;
        isRead: boolean;
    }[]>;
    markRead(req: AuthenticatedRequest, id: string): Promise<{
        id: string;
        createdAt: Date;
        link: string | null;
        userId: string;
        title: string;
        message: string;
        isRead: boolean;
    }>;
    remove(req: AuthenticatedRequest, id: string): Promise<{
        id: string;
        createdAt: Date;
        link: string | null;
        userId: string;
        title: string;
        message: string;
        isRead: boolean;
    }>;
}
export {};
