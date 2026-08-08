import { ApplicationType, ApplicationStatus } from '@prisma/client';
export declare class CreateApplicationDto {
    companyName: string;
    position: string;
    applicationType: ApplicationType;
    applicationUrl?: string;
    status?: ApplicationStatus;
    appliedDate?: string;
    deadline?: string;
    notes?: string;
}
