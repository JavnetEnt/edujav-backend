import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class StudentScoreItemDto {
  @IsUUID()
  studentId: string; // StudentProfile ID

  @IsNumber()
  @Min(0)
  @Max(40)
  ca1: number;

  @IsNumber()
  @Min(0)
  @Max(40)
  ca2: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  exam: number;
}

export class BulkRecordScoresDto {
  @IsUUID()
  classRoomId: string;

  @IsUUID()
  subjectId: string;

  @IsUUID()
  termId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentScoreItemDto)
  scores: StudentScoreItemDto[];
}

export class GenerateBroadsheetDto {
  @IsUUID()
  classRoomId: string;

  @IsUUID()
  termId: string;

  @IsBoolean()
  @IsOptional()
  publish?: boolean; // Set true to make results visible to Parents & Students
}

export class UpdateRemarksDto {
  @IsString()
  @IsOptional()
  teacherComment?: string;

  @IsString()
  @IsOptional()
  principalComment?: string;
}
