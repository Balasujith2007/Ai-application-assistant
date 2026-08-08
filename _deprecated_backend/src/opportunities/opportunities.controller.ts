import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Express.Request {
  user: { id: string };
}

@Controller('opportunities')
@UseGuards(JwtAuthGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get('recommended')
  getRecommended(@Request() req: AuthenticatedRequest) {
    return this.opportunitiesService.getRecommended(req.user.id);
  }
}
