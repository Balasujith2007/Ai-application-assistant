import { DashboardService } from './dashboard.service';
interface AuthenticatedRequest extends Express.Request {
    user: {
        id: string;
        role: string;
    };
}
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getStudentDashboard(req: AuthenticatedRequest): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
        } | null;
        stats: {
            total: number;
            active: number;
            interviews: number;
            selected: number;
            hackathons: number;
        };
        recentApplications: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            location: string | null;
            userId: string;
            description: string | null;
            applicationUrl: string | null;
            companyName: string;
            position: string;
            applicationType: import("@prisma/client").$Enums.ApplicationType;
            salary: string | null;
            nextAction: string | null;
            resumeVersion: string | null;
            status: import("@prisma/client").$Enums.ApplicationStatus;
            appliedDate: Date | null;
            deadline: Date | null;
            notes: string | null;
        }[];
        upcomingDeadlines: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            location: string | null;
            userId: string;
            description: string | null;
            applicationUrl: string | null;
            companyName: string;
            position: string;
            applicationType: import("@prisma/client").$Enums.ApplicationType;
            salary: string | null;
            nextAction: string | null;
            resumeVersion: string | null;
            status: import("@prisma/client").$Enums.ApplicationStatus;
            appliedDate: Date | null;
            deadline: Date | null;
            notes: string | null;
        }[];
        profileCompletion: number;
        resumeScore: number;
        tasks: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            title: string;
            deadline: Date | null;
            category: import("@prisma/client").$Enums.TaskCategory;
            priority: import("@prisma/client").$Enums.TaskPriority;
            isCompleted: boolean;
        }[];
        interviews: {
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
        }[];
        opportunities: {
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
        }[];
    }>;
}
export {};
