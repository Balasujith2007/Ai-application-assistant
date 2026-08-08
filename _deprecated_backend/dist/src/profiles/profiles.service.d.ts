import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateEducationDto, UpdateEducationDto } from './dto/education.dto';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { CreateExperienceDto, UpdateExperienceDto } from './dto/experience.dto';
export declare class ProfilesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMyProfile(userId: string): Promise<{
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
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
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
    addEducation(userId: string, dto: CreateEducationDto): Promise<{
        id: string;
        profileId: string;
        institution: string;
        degree: string;
        fieldOfStudy: string | null;
        startYear: number;
        endYear: number | null;
        grade: string | null;
    }>;
    updateEducation(userId: string, educationId: string, dto: UpdateEducationDto): Promise<{
        id: string;
        profileId: string;
        institution: string;
        degree: string;
        fieldOfStudy: string | null;
        startYear: number;
        endYear: number | null;
        grade: string | null;
    }>;
    deleteEducation(userId: string, educationId: string): Promise<{
        id: string;
        profileId: string;
        institution: string;
        degree: string;
        fieldOfStudy: string | null;
        startYear: number;
        endYear: number | null;
        grade: string | null;
    }>;
    addSkill(userId: string, skillName: string): Promise<{
        id: string;
        name: string;
    }>;
    removeSkill(userId: string, skillId: string): Promise<{
        profileId: string;
        skillId: string;
    }>;
    addProject(userId: string, dto: CreateProjectDto): Promise<{
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
    updateProject(userId: string, projectId: string, dto: UpdateProjectDto): Promise<{
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
    deleteProject(userId: string, projectId: string): Promise<{
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
    addExperience(userId: string, dto: CreateExperienceDto): Promise<{
        id: string;
        role: string;
        profileId: string;
        description: string | null;
        startDate: Date;
        endDate: Date | null;
        company: string;
        currentlyWorking: boolean;
    }>;
    updateExperience(userId: string, expId: string, dto: UpdateExperienceDto): Promise<{
        id: string;
        role: string;
        profileId: string;
        description: string | null;
        startDate: Date;
        endDate: Date | null;
        company: string;
        currentlyWorking: boolean;
    }>;
    deleteExperience(userId: string, expId: string): Promise<{
        id: string;
        role: string;
        profileId: string;
        description: string | null;
        startDate: Date;
        endDate: Date | null;
        company: string;
        currentlyWorking: boolean;
    }>;
    calculateCompletion(profile: {
        phone?: string | null;
        department?: string | null;
        year?: number | null;
        college?: string | null;
        careerObjective?: string | null;
        linkedinUrl?: string | null;
        githubUrl?: string | null;
        education?: unknown[];
        skills?: unknown[];
        projects?: unknown[];
        experiences?: unknown[];
        userId?: string;
        id?: string;
    }): number;
    private getOrCreateProfile;
    private verifyEducationOwnership;
    private verifyProjectOwnership;
    private verifyExperienceOwnership;
}
