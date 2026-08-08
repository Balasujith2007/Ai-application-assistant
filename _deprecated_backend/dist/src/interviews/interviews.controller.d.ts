import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
interface AuthenticatedRequest extends Express.Request {
    user: {
        id: string;
    };
}
export declare class InterviewsController {
    private readonly interviewsService;
    constructor(interviewsService: InterviewsService);
    create(req: AuthenticatedRequest, createInterviewDto: CreateInterviewDto): Promise<{
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
    findAll(req: AuthenticatedRequest): Promise<{
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
    update(req: AuthenticatedRequest, id: string, updateInterviewDto: UpdateInterviewDto): Promise<{
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
    remove(req: AuthenticatedRequest, id: string): Promise<{
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
}
export {};
