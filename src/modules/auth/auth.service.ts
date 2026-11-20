import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { JwtUserPayload } from '../../common/decorators/current-user.decorator.js';
import { getJwtAccessSecret } from '../../common/security/jwt-access-secret.js';
import { ChangePasswordDto, LoginDto, OnboardSchoolDto } from './dto/auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async onboardSchool(dto: OnboardSchoolDto) {
    const slug = dto.slug.toLowerCase();
    const existingTenant = await this.prisma.tenant.findUnique({ where: { slug } });

    if (existingTenant) {
      throw new ConflictException('School slug is already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const { tenant, owner } = await this.prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          name: dto.schoolName,
          slug,
          email: dto.schoolEmail.toLowerCase(),
          phone: dto.phone,
          gradingScales: {
            create: [
              { grade: 'A', minScore: 70, maxScore: 100, remark: 'Excellent' },
              { grade: 'B', minScore: 60, maxScore: 69.99, remark: 'Very Good' },
              { grade: 'C', minScore: 50, maxScore: 59.99, remark: 'Credit' },
              { grade: 'D', minScore: 45, maxScore: 49.99, remark: 'Pass' },
              { grade: 'E', minScore: 40, maxScore: 44.99, remark: 'Fair' },
              { grade: 'F', minScore: 0, maxScore: 39.99, remark: 'Fail' },
            ],
          },
        },
      });

      const createdOwner = await tx.user.create({
        data: {
          tenantId: createdTenant.id,
          email: dto.ownerEmail.toLowerCase(),
          passwordHash,
          firstName: dto.ownerFirstName,
          lastName: dto.ownerLastName,
          phone: dto.phone,
          role: Role.SCHOOL_OWNER,
        },
      });

      return { tenant: createdTenant, owner: createdOwner };
    });

    const tokens = await this.signTokens({
      sub: owner.id,
      tenantId: tenant.id,
      role: owner.role,
      email: owner.email,
    });

    return {
      message: 'School onboarded successfully',
      school: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      user: { id: owner.id, email: owner.email, role: owner.role },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.schoolSlug.toLowerCase() },
    });

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('School portal not found or inactive');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.signTokens({
      sub: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        tenantId: tenant.id,
        schoolName: tenant.name,
      },
      ...tokens,
    };
  }

  private async signTokens(payload: JwtUserPayload) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: getJwtAccessSecret(),
      expiresIn: '1d',
    });

    return { accessToken };
  }

    async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password updated successfully' };
  }

}
