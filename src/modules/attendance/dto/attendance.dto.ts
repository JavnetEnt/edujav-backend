import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class StudentAttendanceItemDto {
  @IsUUID()
  studentId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsString()
  @IsOptional()
  remark?: string;
}

export class MarkClassAttendanceDto {
  @IsUUID()
  classRoomId: string;

  @IsUUID()
  termId: string;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceItemDto)
  records: StudentAttendanceItemDto[];
}
