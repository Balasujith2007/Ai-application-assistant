"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let ResumesService = class ResumesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async uploadResume(userId, file) {
        await this.prisma.resume.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
        });
        const fileUrl = `/uploads/resumes/${file.filename}`;
        const resume = await this.prisma.resume.create({
            data: {
                userId,
                fileName: file.filename,
                fileUrl,
                originalName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
                isActive: true,
            },
        });
        return resume;
    }
    async getMyResumes(userId) {
        return this.prisma.resume.findMany({
            where: { userId },
            orderBy: { uploadedAt: 'desc' },
        });
    }
    async getActiveResume(userId) {
        return this.prisma.resume.findFirst({
            where: { userId, isActive: true },
        });
    }
    async deleteResume(userId, resumeId) {
        const resume = await this.prisma.resume.findFirst({
            where: { id: resumeId, userId },
        });
        if (!resume) {
            throw new common_1.NotFoundException('Resume not found');
        }
        const filePath = path.join(process.cwd(), 'uploads', 'resumes', resume.fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return this.prisma.resume.delete({ where: { id: resumeId } });
    }
    async setActive(userId, resumeId) {
        const resume = await this.prisma.resume.findFirst({
            where: { id: resumeId, userId },
        });
        if (!resume)
            throw new common_1.NotFoundException('Resume not found');
        await this.prisma.resume.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
        });
        return this.prisma.resume.update({
            where: { id: resumeId },
            data: { isActive: true },
        });
    }
};
exports.ResumesService = ResumesService;
exports.ResumesService = ResumesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ResumesService);
//# sourceMappingURL=resumes.service.js.map