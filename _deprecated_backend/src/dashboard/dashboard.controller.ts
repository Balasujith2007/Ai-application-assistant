import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface AuthenticatedRequest extends Express.Request {
  user: { id: string; role: string };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('student')
  @Roles(Role.STUDENT, Role.ADMIN)
  getStudentDashboard(@Request() req: AuthenticatedRequest) {
    return this.dashboardService.getStudentDashboard(req.user.id);
  }
}
