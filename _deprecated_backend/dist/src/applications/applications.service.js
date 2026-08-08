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
exports.ApplicationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ApplicationsService = class ApplicationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        return this.prisma.application.create({
            data: { userId, ...dto },
        });
    }
    async findAll(userId, filters) {
        return this.prisma.application.findMany({
            where: {
                userId,
                ...(filters.type && { applicationType: filters.type }),
                ...(filters.status && { status: filters.status }),
                ...(filters.search && {
                    OR: [
                        { companyName: { contains: filters.search, mode: 'insensitive' } },
                        { position: { contains: filters.search, mode: 'insensitive' } },
                    ],
                }),
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(userId, id) {
        const app = await this.prisma.application.findFirst({
            where: { id, userId },
        });
        if (!app)
            throw new common_1.NotFoundException('Application not found');
        return app;
    }
    async update(userId, id, dto) {
        await this.verifyOwnership(userId, id);
        return this.prisma.application.update({
            where: { id },
            data: dto,
        });
    }
    async remove(userId, id) {
        await this.verifyOwnership(userId, id);
        return this.prisma.application.delete({ where: { id } });
    }
    async getStats(userId) {
        const [total, active, interviews, selected, hackathons] = await Promise.all([
            this.prisma.application.count({ where: { userId } }),
            this.prisma.application.count({
                where: {
                    userId,
                    status: { in: ['APPLIED', 'SHORTLISTED'] },
                },
            }),
            this.prisma.application.count({
                where: { userId, status: 'INTERVIEW' },
            }),
            this.prisma.application.count({
                where: { userId, status: 'SELECTED' },
            }),
            this.prisma.application.count({
                where: { userId, applicationType: 'HACKATHON' },
            }),
        ]);
        return { total, active, interviews, selected, hackathons };
    }
    async getUpcomingDeadlines(userId) {
        const now = new Date();
        const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        return this.prisma.application.findMany({
            where: {
                userId,
                deadline: {
                    gte: now,
                    lte: twoWeeksLater,
                },
                status: { notIn: ['REJECTED', 'WITHDRAWN', 'SELECTED'] },
            },
            orderBy: { deadline: 'asc' },
            take: 5,
        });
    }
    async verifyOwnership(userId, id) {
        const app = await this.prisma.application.findFirst({
            where: { id, userId },
        });
        if (!app)
            throw new common_1.ForbiddenException('Not authorized');
    }
};
exports.ApplicationsService = ApplicationsService;
exports.ApplicationsService = ApplicationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ApplicationsService);
//# sourceMappingURL=applications.service.js.map