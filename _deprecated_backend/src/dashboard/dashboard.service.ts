import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ApplicationsService } from '../applications/applications.service';
import { TasksService } from '../tasks/tasks.service';
import { InterviewsService } from '../interviews/interviews.service';
import { OpportunitiesService } from '../opportunities/opportunities.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly applicationsService: ApplicationsService,
    private readonly tasksService: TasksService,
    private readonly interviewsService: InterviewsService,
    private readonly opportunitiesService: OpportunitiesService,
  ) {}

  async getStudentDashboard(userId: string) {
    const [
      appStats,
      deadlines,
      recentApplications,
      profile,
      user,
      tasks,
      interviews,
      opportunities,
    ] = await Promise.all([
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

    // Ensure profile is not null before calculating completion
    const profileData = profile || { userId };
    const profileCompletion = this.profilesService.calculateCompletion(profileData as any);
    
    // Mock resume score
    const resumeScore = 85;

    // Filter today's tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysTasks = tasks.filter((t) => {
      if (!t.deadline) return false;
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
}
