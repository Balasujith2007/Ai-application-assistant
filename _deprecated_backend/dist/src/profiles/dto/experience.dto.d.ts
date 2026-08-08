export declare class CreateExperienceDto {
    company: string;
    role: string;
    description?: string;
    startDate: string;
    endDate?: string;
    currentlyWorking?: boolean;
}
export declare class UpdateExperienceDto {
    company?: string;
    role?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    currentlyWorking?: boolean;
}
