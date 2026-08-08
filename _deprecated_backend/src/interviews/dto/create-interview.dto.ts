import { IsString, IsEnum, IsOptional, IsDateString, IsArray } from 'class-validator';
import { InterviewType } from '@prisma/client';

export class CreateInterviewDto {
  @IsString()
  companyName: string;

  @IsString()
  role: string;

  @IsEnum(InterviewType)
  @IsOptional()
  type?: InterviewType;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  prepTopics?: string[];
}
