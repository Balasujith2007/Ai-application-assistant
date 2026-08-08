"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProfilesService = class ProfilesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMyProfile(userId) {
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
    async updateProfile(userId, dto) {
        return this.prisma.profile.upsert({
            where: { userId },
            create: { userId, ...dto },
            update: dto,
        });
    }
    async addEducation(userId, dto) {
        const profile = await this.getOrCreateProfile(userId);
        return this.prisma.education.create({
            data: { profileId: profile.id, ...dto },
        });
    }
    async updateEducation(userId, educationId, dto) {
        await this.verifyEducationOwnership(userId, educationId);
        return this.prisma.education.update({
            where: { id: educationId },
            data: dto,
        });
    }
    async deleteEducation(userId, educationId) {
        await this.verifyEducationOwnership(userId, educationId);
        return this.prisma.education.delete({ where: { id: educationId } });
    }
    async addSkill(userId, skillName) {
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
    async removeSkill(userId, skillId) {
        const profile = await this.getOrCreateProfile(userId);
        return this.prisma.profileSkill.delete({
            where: {
                profileId_skillId: { profileId: profile.id, skillId },
            },
        });
    }
    async addProject(userId, dto) {
        const profile = await this.getOrCreateProfile(userId);
        return this.prisma.project.create({
            data: { profileId: profile.id, ...dto },
        });
    }
    async updateProject(userId, projectId, dto) {
        await this.verifyProjectOwnership(userId, projectId);
        return this.prisma.project.update({
            where: { id: projectId },
            data: dto,
        });
    }
    async deleteProject(userId, projectId) {
        await this.verifyProjectOwnership(userId, projectId);
        return this.prisma.project.delete({ where: { id: projectId } });
    }
    async addExperience(userId, dto) {
        const profile = await this.getOrCreateProfile(userId);
        return this.prisma.experience.create({
            data: { profileId: profile.id, ...dto },
        });
    }
    async updateExperience(userId, expId, dto) {
        await this.verifyExperienceOwnership(userId, expId);
        return this.prisma.experience.update({
            where: { id: expId },
            data: dto,
        });
    }
    async deleteExperience(userId, expId) {
        await this.verifyExperienceOwnership(userId, expId);
        return this.prisma.experience.delete({ where: { id: expId } });
    }
    calculateCompletion(profile) {
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
    async getOrCreateProfile(userId) {
        let profile = await this.prisma.profile.findUnique({ where: { userId } });
        if (!profile) {
            profile = await this.prisma.profile.create({ data: { userId } });
        }
        return profile;
    }
    async verifyEducationOwnership(userId, educationId) {
        const profile = await this.prisma.profile.findUnique({ where: { userId } });
        if (!profile)
            throw new common_1.NotFoundException('Profile not found');
        const edu = await this.prisma.education.findFirst({
            where: { id: educationId, profileId: profile.id },
        });
        if (!edu)
            throw new common_1.ForbiddenException('Not allowed');
    }
    async verifyProjectOwnership(userId, projectId) {
        const profile = await this.prisma.profile.findUnique({ where: { userId } });
        if (!profile)
            throw new common_1.NotFoundException('Profile not found');
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, profileId: profile.id },
        });
        if (!project)
            throw new common_1.ForbiddenException('Not allowed');
    }
    async verifyExperienceOwnership(userId, expId) {
        const profile = await this.prisma.profile.findUnique({ where: { userId } });
        if (!profile)
            throw new common_1.NotFoundException('Profile not found');
        const exp = await this.prisma.experience.findFirst({
            where: { id: expId, profileId: profile.id },
        });
        if (!exp)
            throw new common_1.ForbiddenException('Not allowed');
    }
};
exports.ProfilesService = ProfilesService;
exports.ProfilesService = ProfilesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProfilesService);
//# sourceMappingURL=profiles.service.js.map