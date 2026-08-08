import { PrismaService } from '../prisma/prisma.service';
export declare class OpportunitiesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRecommended(userId: string): Promise<{
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
