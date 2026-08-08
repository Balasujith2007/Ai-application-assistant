import { PartialType } from '@nestjs/mapped-types';
import { CreateInterviewDto } from './create-interview.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateInterviewDto extends PartialType(CreateInterviewDto) {
  @IsString()
  @IsOptional()
  feedback?: string;
}
