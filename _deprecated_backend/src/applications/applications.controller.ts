import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApplicationType, ApplicationStatus } from '@prisma/client';

interface AuthenticatedRequest extends Express.Request {
  user: { id: string };
}

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(req.user.id, dto);
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('type') type?: ApplicationType,
    @Query('status') status?: ApplicationStatus,
    @Query('search') search?: string,
  ) {
    return this.applicationsService.findAll(req.user.id, { type, status, search });
  }

  @Get('stats')
  getStats(@Request() req: AuthenticatedRequest) {
    return this.applicationsService.getStats(req.user.id);
  }

  @Get('deadlines')
  getDeadlines(@Request() req: AuthenticatedRequest) {
    return this.applicationsService.getUpcomingDeadlines(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.applicationsService.findOne(req.user.id, id);
  }

  @Put(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.applicationsService.remove(req.user.id, id);
  }
}
