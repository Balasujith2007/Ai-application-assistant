import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateEducationDto, UpdateEducationDto } from './dto/education.dto';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
} from './dto/experience.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Express.Request {
  user: { id: string };
}

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  getMyProfile(@Request() req: AuthenticatedRequest) {
    return this.profilesService.getMyProfile(req.user.id);
  }

  @Put('me')
  updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.updateProfile(req.user.id, dto);
  }

  // Education
  @Post('education')
  addEducation(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateEducationDto,
  ) {
    return this.profilesService.addEducation(req.user.id, dto);
  }

  @Put('education/:id')
  updateEducation(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateEducationDto,
  ) {
    return this.profilesService.updateEducation(req.user.id, id, dto);
  }

  @Delete('education/:id')
  deleteEducation(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.profilesService.deleteEducation(req.user.id, id);
  }

  // Skills
  @Post('skills')
  addSkill(
    @Request() req: AuthenticatedRequest,
    @Body() body: { name: string },
  ) {
    return this.profilesService.addSkill(req.user.id, body.name);
  }

  @Delete('skills/:skillId')
  removeSkill(
    @Request() req: AuthenticatedRequest,
    @Param('skillId') skillId: string,
  ) {
    return this.profilesService.removeSkill(req.user.id, skillId);
  }

  // Projects
  @Post('projects')
  addProject(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateProjectDto,
  ) {
    return this.profilesService.addProject(req.user.id, dto);
  }

  @Put('projects/:id')
  updateProject(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.profilesService.updateProject(req.user.id, id, dto);
  }

  @Delete('projects/:id')
  deleteProject(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.profilesService.deleteProject(req.user.id, id);
  }

  // Experience
  @Post('experience')
  addExperience(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateExperienceDto,
  ) {
    return this.profilesService.addExperience(req.user.id, dto);
  }

  @Put('experience/:id')
  updateExperience(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.profilesService.updateExperience(req.user.id, id, dto);
  }

  @Delete('experience/:id')
  deleteExperience(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.profilesService.deleteExperience(req.user.id, id);
  }
}
