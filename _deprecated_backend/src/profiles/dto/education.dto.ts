import { IsString, IsNotEmpty, IsOptional, IsInt, MaxLength } from 'class-validator';

export class CreateEducationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  institution: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  degree: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldOfStudy?: string;

  @IsInt()
  startYear: number;

  @IsOptional()
  @IsInt()
  endYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  grade?: string;
}

export class UpdateEducationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  institution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  degree?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldOfStudy?: string;

  @IsOptional()
  @IsInt()
  startYear?: number;

  @IsOptional()
  @IsInt()
  endYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  grade?: string;
}
