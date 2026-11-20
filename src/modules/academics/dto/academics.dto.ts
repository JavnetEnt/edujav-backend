import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g., "2026/2027"

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class CreateTermDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  name: string; // e.g., "First Term"

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class CreateClassRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g., "JSS 1"

  @IsString()
  @IsOptional()
  arm?: string; // e.g., "A"
}

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g., "Mathematics"

  @IsString()
  @IsOptional()
  code?: string; // e.g., "MTH101"
}

export class AssignTeacherDto {
  @IsUUID()
  teacherId: string;

  @IsUUID()
  classRoomId: string;

  @IsUUID()
  subjectId: string;
}


export class GenerateTimetableDto {
  @IsUUID()
  termId: string;

  @IsInt()
  @IsIn([40, 45, 60], { message: 'Period duration must be 40, 45, or 60 minutes' })
  periodDurationMinutes: 40 | 45 | 60;

  @IsString()
  @IsOptional()
  startTime?: string; // e.g., "08:00"

  @IsInt()
  @IsOptional()
  periodsPerDay?: number;
}
