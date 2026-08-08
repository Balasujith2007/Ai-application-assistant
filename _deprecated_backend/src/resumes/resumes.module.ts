import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { ResumeParserService } from './resume-parser.service';

@Module({
  imports: [
    MulterModule.register({ dest: './uploads/resumes' }),
  ],
  controllers: [ResumesController],
  providers: [ResumesService, ResumeParserService],
  exports: [ResumesService],
})
export class ResumesModule {}
