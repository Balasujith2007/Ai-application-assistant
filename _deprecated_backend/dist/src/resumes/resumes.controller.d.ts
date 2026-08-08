import { ResumesService } from './resumes.service';
interface AuthenticatedRequest extends Express.Request {
    user: {
        id: string;
    };
}
export declare class ResumesController {
    private readonly resumesService;
    constructor(resumesService: ResumesService);
    uploadResume(req: AuthenticatedRequest, file: Express.Multer.File): Promise<{
        id: string;
        userId: string;
        isActive: boolean;
        fileName: string;
        fileUrl: string;
        originalName: string;
        mimeType: string | null;
        fileSize: number | null;
        uploadedAt: Date;
    }>;
    getMyResumes(req: AuthenticatedRequest): Promise<{
        id: string;
        userId: string;
        isActive: boolean;
        fileName: string;
        fileUrl: string;
        originalName: string;
        mimeType: string | null;
        fileSize: number | null;
        uploadedAt: Date;
    }[]>;
    getActiveResume(req: AuthenticatedRequest): Promise<{
        id: string;
        userId: string;
        isActive: boolean;
        fileName: string;
        fileUrl: string;
        originalName: string;
        mimeType: string | null;
        fileSize: number | null;
        uploadedAt: Date;
    } | null>;
    setActive(req: AuthenticatedRequest, id: string): Promise<{
        id: string;
        userId: string;
        isActive: boolean;
        fileName: string;
        fileUrl: string;
        originalName: string;
        mimeType: string | null;
        fileSize: number | null;
        uploadedAt: Date;
    }>;
    deleteResume(req: AuthenticatedRequest, id: string): Promise<{
        id: string;
        userId: string;
        isActive: boolean;
        fileName: string;
        fileUrl: string;
        originalName: string;
        mimeType: string | null;
        fileSize: number | null;
        uploadedAt: Date;
    }>;
}
export {};
