export declare class CreateProjectDto {
    title: string;
    description?: string;
    technologies?: string[];
    githubUrl?: string;
    liveUrl?: string;
    startDate?: string;
    endDate?: string;
}
export declare class UpdateProjectDto {
    title?: string;
    description?: string;
    technologies?: string[];
    githubUrl?: string;
    liveUrl?: string;
    startDate?: string;
    endDate?: string;
}
