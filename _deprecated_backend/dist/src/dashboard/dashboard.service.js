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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const profiles_service_1 = require("../profiles/profiles.service");
const applications_service_1 = require("../applications/applications.service");
const tasks_service_1 = require("../tasks/tasks.service");
const interviews_service_1 = require("../interviews/interviews.service");
const opportunities_service_1 = require("../opportunities/opportunities.service");
let DashboardService = class DashboardService {
    prisma;
    profilesService;
    applicationsService;
    tasksService;
    interviewsService;
    opportunitiesService;
    constructor(prisma, profilesService, applicationsService, tasksService, interviewsService, opportunitiesService) {
        this.prisma = prisma;
        this.profilesService = profilesService;
        this.applicationsService = applicationsService;
        this.tasksService = tasksService;
        this.interviewsService = interviewsService;
        this.opportunitiesService = opportunitiesService;
    }
    async getStudentDashboard(userId) {
        const [appStats, deadlines, recentApplications, profile, user, tasks, interviews, opportunities,] = await Promise.all([
            this.applicationsService.getStats(userId),
            this.applicationsService.getUpcomingDeadlines(userId),
            this.prisma.application.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            this.profilesService.getMyProfile(userId),
            this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, email: true },
            }),
            this.tasksService.findAll(userId),
            this.interviewsService.findAll(userId),
            this.opportunitiesService.getRecommended(userId),
        ]);
        const profileData = profile || { userId };
        const profileCompletion = this.profilesService.calculateCompletion(profileData);
        const resumeScore = 85;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todaysTasks = tasks.filter((t) => {
            if (!t.deadline)
                return false;
            const tDate = new Date(t.deadline);
            return tDate >= today && tDate < tomorrow;
        });
        return {
            user,
            stats: appStats,
            recentApplications,
            upcomingDeadlines: deadlines,
            profileCompletion,
            resumeScore,
            tasks: todaysTasks,
            interviews,
            opportunities,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        profiles_service_1.ProfilesService,
        applications_service_1.ApplicationsService,
        tasks_service_1.TasksService,
        interviews_service_1.InterviewsService,
        opportunities_service_1.OpportunitiesService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map