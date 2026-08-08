import { PrismaService } from '../prisma/prisma.service';
export declare class ResumesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    uploadResume(userId: string, file: Express.Multer.File): Promise<{
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
    getMyResumes(userId: string): Promise<{
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
    getActiveResume(userId: string): Promise<{
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
    deleteResume(userId: string, resumeId: string): Promise<{
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
    setActive(userId: string, resumeId: string): Promise<{
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
