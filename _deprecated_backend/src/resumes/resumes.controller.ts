import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ResumesService } from './resumes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Express.Request {
  user: { id: string };
}

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/resumes',
        filename: (_req, file, cb) => {
          const uniqueId = uuidv4();
          cb(null, `${uniqueId}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF and DOCX files are allowed'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  uploadResume(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.resumesService.uploadResume(req.user.id, file);
  }

  @Get()
  getMyResumes(@Request() req: AuthenticatedRequest) {
    return this.resumesService.getMyResumes(req.user.id);
  }

  @Get('active')
  getActiveResume(@Request() req: AuthenticatedRequest) {
    return this.resumesService.getActiveResume(req.user.id);
  }

  @Patch(':id/activate')
  setActive(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.resumesService.setActive(req.user.id, id);
  }

  @Delete(':id')
  deleteResume(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.resumesService.deleteResume(req.user.id, id);
  }
}
