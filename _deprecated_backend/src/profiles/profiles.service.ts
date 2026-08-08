import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateEducationDto, UpdateEducationDto } from './dto/education.dto';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
} from './dto/experience.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        education: { orderBy: { startYear: 'desc' } },
        projects: { orderBy: { id: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        skills: { include: { skill: true } },
      },
    });

    if (!profile) {
      profile = await this.prisma.profile.create({
        data: { userId },
        include: {
          education: true,
          projects: true,
          experiences: true,
          skills: { include: { skill: true } },
        },
      });
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.profile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  // Education
  async addEducation(userId: string, dto: CreateEducationDto) {
    const profile = await this.getOrCreateProfile(userId);
    return this.prisma.education.create({
      data: { profileId: profile.id, ...dto },
    });
  }

  async updateEducation(
    userId: string,
    educationId: string,
    dto: UpdateEducationDto,
  ) {
    await this.verifyEducationOwnership(userId, educationId);
    return this.prisma.education.update({
      where: { id: educationId },
      data: dto,
    });
  }

  async deleteEducation(userId: string, educationId: string) {
    await this.verifyEducationOwnership(userId, educationId);
    return this.prisma.education.delete({ where: { id: educationId } });
  }

  // Skills
  async addSkill(userId: string, skillName: string) {
    const profile = await this.getOrCreateProfile(userId);

    const skill = await this.prisma.skill.upsert({
      where: { name: skillName.trim().toLowerCase() },
      create: { name: skillName.trim().toLowerCase() },
      update: {},
    });

    await this.prisma.profileSkill.upsert({
      where: {
        profileId_skillId: { profileId: profile.id, skillId: skill.id },
      },
      create: { profileId: profile.id, skillId: skill.id },
      update: {},
    });

    return skill;
  }

  async removeSkill(userId: string, skillId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return this.prisma.profileSkill.delete({
      where: {
        profileId_skillId: { profileId: profile.id, skillId },
      },
    });
  }

  // Projects
  async addProject(userId: string, dto: CreateProjectDto) {
    const profile = await this.getOrCreateProfile(userId);
    return this.prisma.project.create({
      data: { profileId: profile.id, ...dto },
    });
  }

  async updateProject(userId: string, projectId: string, dto: UpdateProjectDto) {
    await this.verifyProjectOwnership(userId, projectId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: dto,
    });
  }

  async deleteProject(userId: string, projectId: string) {
    await this.verifyProjectOwnership(userId, projectId);
    return this.prisma.project.delete({ where: { id: projectId } });
  }

  // Experience
  async addExperience(userId: string, dto: CreateExperienceDto) {
    const profile = await this.getOrCreateProfile(userId);
    return this.prisma.experience.create({
      data: { profileId: profile.id, ...dto },
    });
  }

  async updateExperience(
    userId: string,
    expId: string,
    dto: UpdateExperienceDto,
  ) {
    await this.verifyExperienceOwnership(userId, expId);
    return this.prisma.experience.update({
      where: { id: expId },
      data: dto,
    });
  }

  async deleteExperience(userId: string, expId: string) {
    await this.verifyExperienceOwnership(userId, expId);
    return this.prisma.experience.delete({ where: { id: expId } });
  }

  // Profile completion calculation
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
  }): number {
    const checks = [
      !!profile.phone,
      !!profile.department,
      !!profile.year,
      !!profile.college,
      !!profile.careerObjective,
      !!profile.linkedinUrl,
      !!profile.githubUrl,
      (profile.education?.length ?? 0) > 0,
      (profile.skills?.length ?? 0) > 0,
      (profile.projects?.length ?? 0) > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  // Helpers
  private async getOrCreateProfile(userId: string) {
    let profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await this.prisma.profile.create({ data: { userId } });
    }
    return profile;
  }

  private async verifyEducationOwnership(userId: string, educationId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');
    const edu = await this.prisma.education.findFirst({
      where: { id: educationId, profileId: profile.id },
    });
    if (!edu) throw new ForbiddenException('Not allowed');
  }

  private async verifyProjectOwnership(userId: string, projectId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, profileId: profile.id },
    });
    if (!project) throw new ForbiddenException('Not allowed');
  }

  private async verifyExperienceOwnership(userId: string, expId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');
    const exp = await this.prisma.experience.findFirst({
      where: { id: expId, profileId: profile.id },
    });
    if (!exp) throw new ForbiddenException('Not allowed');
  }
}
