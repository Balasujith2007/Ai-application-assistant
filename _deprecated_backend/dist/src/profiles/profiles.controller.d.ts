import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateEducationDto, UpdateEducationDto } from './dto/education.dto';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { CreateExperienceDto, UpdateExperienceDto } from './dto/experience.dto';
interface AuthenticatedRequest extends Express.Request {
    user: {
        id: string;
    };
}
export declare class ProfilesController {
    private readonly profilesService;
    constructor(profilesService: ProfilesService);
    getMyProfile(req: AuthenticatedRequest): Promise<{
        education: {
            id: string;
            profileId: string;
            institution: string;
            degree: string;
            fieldOfStudy: string | null;
            startYear: number;
            endYear: number | null;
            grade: string | null;
        }[];
        projects: {
            id: string;
            githubUrl: string | null;
            profileId: string;
            title: string;
            description: string | null;
            technologies: string[];
            liveUrl: string | null;
            startDate: Date | null;
            endDate: Date | null;
        }[];
        experiences: {
            id: string;
            role: string;
            profileId: string;
            description: string | null;
            startDate: Date;
            endDate: Date | null;
            company: string;
            currentlyWorking: boolean;
        }[];
        skills: ({
            skill: {
                id: string;
                name: string;
            };
        } & {
            profileId: string;
            skillId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        department: string | null;
        year: number | null;
        section: string | null;
        college: string | null;
        location: string | null;
        careerObjective: string | null;
        linkedinUrl: string | null;
        githubUrl: string | null;
        portfolioUrl: string | null;
        userId: string;
    }>;
    updateProfile(req: AuthenticatedRequest, dto: UpdateProfileDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        department: string | null;
        year: number | null;
        section: string | null;
        college: string | null;
        location: string | null;
        careerObjective: string | null;
        linkedinUrl: string | null;
        githubUrl: string | null;
        portfolioUrl: string | null;
        userId: string;
    }>;
    addEducation(req: AuthenticatedRequest, dto: CreateEducationDto): Promise<{
        id: string;
        profileId: string;
        institution: string;
        degree: string;
        fieldOfStudy: string | null;
        startYear: number;
        endYear: number | null;
        grade: string | null;
    }>;
    updateEducation(req: AuthenticatedRequest, id: string, dto: UpdateEducationDto): Promise<{
        id: string;
        profileId: string;
        institution: string;
        degree: string;
        fieldOfStudy: string | null;
        startYear: number;
        endYear: number | null;
        grade: string | null;
    }>;
    deleteEducation(req: AuthenticatedRequest, id: string): Promise<{
        id: string;
        profileId: string;
        institution: string;
        degree: string;
        fieldOfStudy: string | null;
        startYear: number;
        endYear: number | null;
        grade: string | null;
    }>;
    addSkill(req: AuthenticatedRequest, body: {
        name: string;
    }): Promise<{
        id: string;
        name: string;
    }>;
    removeSkill(req: AuthenticatedRequest, skillId: string): Promise<{
        profileId: string;
        skillId: string;
    }>;
    addProject(req: AuthenticatedRequest, dto: CreateProjectDto): Promise<{
        id: string;
        githubUrl: string | null;
        profileId: string;
        title: string;
        description: string | null;
        technologies: string[];
        liveUrl: string | null;
        startDate: Date | null;
        endDate: Date | null;
    }>;
    updateProject(req: AuthenticatedRequest, id: string, dto: UpdateProjectDto): Promise<{
        id: string;
        githubUrl: string | null;
        profileId: string;
        title: string;
        description: string | null;
        technologies: string[];
        liveUrl: string | null;
        startDate: Date | null;
        endDate: Date | null;
    }>;
    deleteProject(req: AuthenticatedRequest, id: string): Promise<{
        id: string;
        githubUrl: string | null;
        profileId: string;
        title: string;
        description: string | null;
        technologies: string[];
        liveUrl: string | null;
        startDate: Date | null;
        endDate: Date | null;
    }>;
    addExperience(req: AuthenticatedRequest, dto: CreateExperienceDto): Promise<{
        id: string;
        role: string;
        profileId: string;
        description: string | null;
        startDate: Date;
        endDate: Date | null;
        company: string;
        currentlyWorking: boolean;
    }>;
    updateExperience(req: AuthenticatedRequest, id: string, dto: UpdateExperienceDto): Promise<{
        id: string;
        role: string;
        profileId: string;
        description: string | null;
        startDate: Date;
        endDate: Date | null;
        company: string;
        currentlyWorking: boolean;
    }>;
    deleteExperience(req: AuthenticatedRequest, id: string): Promise<{
        id: string;
        role: string;
        profileId: string;
        description: string | null;
        startDate: Date;
        endDate: Date | null;
        company: string;
        currentlyWorking: boolean;
    }>;
}
export {};
