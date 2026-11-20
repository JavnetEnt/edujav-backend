import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class OnboardSchoolDto {
  @IsString()
  @IsNotEmpty()
  schoolName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsEmail()
  schoolEmail: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  ownerFirstName: string;

  @IsString()
  @IsNotEmpty()
  ownerLastName: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  schoolSlug: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
