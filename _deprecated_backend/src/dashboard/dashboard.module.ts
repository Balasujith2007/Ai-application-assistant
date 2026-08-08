import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ProfilesModule } from '../profiles/profiles.module';
import { ApplicationsModule } from '../applications/applications.module';
import { TasksModule } from '../tasks/tasks.module';
import { InterviewsModule } from '../interviews/interviews.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';

@Module({
  imports: [
    ProfilesModule,
    ApplicationsModule,
    TasksModule,
    InterviewsModule,
    OpportunitiesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
