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
exports.InterviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let InterviewsService = class InterviewsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        return this.prisma.interview.create({
            data: {
                userId,
                ...dto,
            },
        });
    }
    async findAll(userId) {
        return this.prisma.interview.findMany({
            where: { userId },
            orderBy: { date: 'asc' },
        });
    }
    async update(userId, id, dto) {
        await this.verifyOwnership(userId, id);
        return this.prisma.interview.update({
            where: { id },
            data: dto,
        });
    }
    async remove(userId, id) {
        await this.verifyOwnership(userId, id);
        return this.prisma.interview.delete({ where: { id } });
    }
    async verifyOwnership(userId, id) {
        const interview = await this.prisma.interview.findFirst({
            where: { id, userId },
        });
        if (!interview)
            throw new common_1.ForbiddenException('Not authorized');
        return interview;
    }
};
exports.InterviewsService = InterviewsService;
exports.InterviewsService = InterviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InterviewsService);
//# sourceMappingURL=interviews.service.js.map