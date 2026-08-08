import { OpportunitiesService } from './opportunities.service';
interface AuthenticatedRequest extends Express.Request {
    user: {
        id: string;
    };
}
export declare class OpportunitiesController {
    private readonly opportunitiesService;
    constructor(opportunitiesService: OpportunitiesService);
    getRecommended(req: AuthenticatedRequest): Promise<{
        matchScore: number;
        id: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        description: string;
        companyName: string;
        salary: string | null;
        deadline: Date;
        type: import("@prisma/client").$Enums.OpportunityType;
        applyUrl: string;
        minCgpa: number | null;
        requiredSkills: string[];
        allowedDegrees: string[];
        allowedYears: number[];
    }[]>;
}
export {};
