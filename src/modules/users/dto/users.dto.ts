import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum([Role.ADMIN, Role.BURSAR, Role.TEACHER], {
    message: 'Staff role must be ADMIN, BURSAR, or TEACHER',
  })
  role: Role;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string; // Defaults to "Staff@123" if omitted
}

export class EnrollStudentDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsOptional()
  studentEmail?: string; // Auto-generated from admission number if omitted

  @IsUUID()
  classRoomId: string;

  @IsString()
  @IsOptional()
  gender?: string;

  // Optional Parent Details (Auto-creates & links Parent account!)
  @IsString()
  @IsOptional()
  parentFirstName?: string;

  @IsString()
  @IsOptional()
  parentLastName?: string;

  @IsEmail()
  @IsOptional()
  parentEmail?: string;

  @IsString()
  @IsOptional()
  parentPhone?: string;
}
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsUUID()
  @IsOptional()
  classRoomId?: string; // Allows promoting or moving a student to another class
}

