import { PrismaService } from '../prisma/prisma.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
export declare class InterviewsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateInterviewDto): Promise<{
        id: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        userId: string;
        companyName: string;
        type: import("@prisma/client").$Enums.InterviewType;
        date: Date;
        time: string | null;
        prepTopics: string[];
        feedback: string | null;
    }>;
    findAll(userId: string): Promise<{
        id: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        userId: string;
        companyName: string;
        type: import("@prisma/client").$Enums.InterviewType;
        date: Date;
        time: string | null;
        prepTopics: string[];
        feedback: string | null;
    }[]>;
    update(userId: string, id: string, dto: UpdateInterviewDto): Promise<{
        id: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        userId: string;
        companyName: string;
        type: import("@prisma/client").$Enums.InterviewType;
        date: Date;
        time: string | null;
        prepTopics: string[];
        feedback: string | null;
    }>;
    remove(userId: string, id: string): Promise<{
        id: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        userId: string;
        companyName: string;
        type: import("@prisma/client").$Enums.InterviewType;
        date: Date;
        time: string | null;
        prepTopics: string[];
        feedback: string | null;
    }>;
    private verifyOwnership;
}
