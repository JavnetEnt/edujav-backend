import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateStaffDto, EnrollStudentDto, UpdateUserDto } from './dto/users.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Create Staff (Teacher, Bursar, Admin)
  async createStaff(tenantId: string, dto: CreateStaffDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (existing) {
      throw new ConflictException(`A user with email ${email} already exists in this school`);
    }

    const rawPassword = dto.password || 'Staff@123';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const staff = await this.prisma.user.create({
      data: {
        tenantId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        phone: dto.phone,
        role: dto.role,
        passwordHash,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      message: 'Staff account created successfully',
      staff,
      defaultPassword: dto.password ? undefined : rawPassword,
    };
  }

  // 2. Enroll Single Student + Auto-Generate Admission Number + Link Parent
  async enrollStudent(tenantId: string, dto: EnrollStudentDto) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });

    const classRoom = await this.prisma.classRoom.findFirst({
      where: { id: dto.classRoomId, tenantId },
    });
    if (!classRoom) {
      throw new BadRequestException('Selected classroom does not belong to this school');
    }

    const studentDefaultHash = await bcrypt.hash('Student@123', 10);
    const parentDefaultHash = await bcrypt.hash('Parent@123', 10);

    return this.prisma.$transaction(async (tx) => {
      // Generate unique admission number: e.g., ROYAL-CROWN/2026/0001
      const studentCount = await tx.studentProfile.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const prefix = tenant.slug.toUpperCase().slice(0, 6);
      const admissionNumber = `${prefix}/${year}/${String(studentCount + 1).padStart(4, '0')}`;

      const generatedEmail =
        dto.studentEmail?.toLowerCase() ||
        `${admissionNumber.replace(/\//g, '').toLowerCase()}@${tenant.slug}.edu`;

      const studentUser = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email: generatedEmail,
          role: Role.STUDENT,
          passwordHash: studentDefaultHash,
        },
      });

      const studentProfile = await tx.studentProfile.create({
        data: {
          tenantId,
          userId: studentUser.id,
          admissionNumber,
          classRoomId: classRoom.id,
          gender: dto.gender,
        },
      });

      // Upsert & Link Parent if parentEmail is provided
      let linkedParent: { id: string; email: string } | null = null;
      if (dto.parentEmail) {
        const pEmail = dto.parentEmail.toLowerCase();
        const parentUser = await tx.user.upsert({
          where: { tenantId_email: { tenantId, email: pEmail } },
          update: {},
          create: {
            tenantId,
            firstName: dto.parentFirstName?.trim() || 'Parent',
            lastName: dto.parentLastName?.trim() || dto.lastName.trim(),
            email: pEmail,
            phone: dto.parentPhone,
            role: Role.PARENT,
            passwordHash: parentDefaultHash,
          },
        });

        await tx.parentStudent.create({
          data: {
            tenantId,
            parentId: parentUser.id,
            studentId: studentProfile.id,
          },
        });

        linkedParent = { id: parentUser.id, email: parentUser.email };
      }

      return {
        admissionNumber,
        student: {
          id: studentUser.id,
          profileId: studentProfile.id,
          name: `${studentUser.firstName} ${studentUser.lastName}`,
          email: studentUser.email,
          class: `${classRoom.name}${classRoom.arm ? ' ' + classRoom.arm : ''}`,
        },
        linkedParent,
      };
    });
  }

  // 3. Bulk CSV Student Upload
  async bulkEnrollStudentsFromCsv(tenantId: string, fileBuffer: Buffer) {
    const records: Record<string, string>[] = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!records.length) {
      throw new BadRequestException('CSV file is empty');
    }

    // Preload school classrooms into a map for fast lookup (e.g., "JSS 1-A" -> id)
    const classrooms = await this.prisma.classRoom.findMany({ where: { tenantId } });
    const classMap = new Map<string, string>();
    for (const c of classrooms) {
      const key = `${c.name.toLowerCase()}-${(c.arm || '').toLowerCase()}`;
      classMap.set(key, c.id);
    }

    const enrolled: any[] = [];
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 accounts for 1-based index + header row

      const classKey = `${(row.className || '').toLowerCase()}-${(row.arm || '').toLowerCase()}`;
      const classRoomId = classMap.get(classKey);

      if (!row.firstName || !row.lastName || !classRoomId) {
        errors.push({
          row: rowNum,
          reason: `Missing name or invalid class/arm (${row.className || ''} ${row.arm || ''})`,
        });
        continue;
      }

      try {
        const result = await this.enrollStudent(tenantId, {
          firstName: row.firstName,
          lastName: row.lastName,
          classRoomId,
          gender: row.gender,
          parentFirstName: row.parentFirstName,
          parentLastName: row.parentLastName,
          parentEmail: row.parentEmail,
          parentPhone: row.parentPhone,
        });
        enrolled.push(result);
      } catch (err: any) {
        errors.push({ row: rowNum, reason: err.message || 'Failed to enroll row' });
      }
    }

    return {
      summary: {
        totalRows: records.length,
        successfullyEnrolled: enrolled.length,
        failedRows: errors.length,
      },
      enrolled,
      errors,
    };
  }

  // 4. List School Members by Role
  async listUsers(
    tenantId: string,
    role: Role | undefined,
    requestingUserId: string,
    requestingRole: Role,
  ) {
    const where: Prisma.UserWhereInput = { tenantId };

    if (requestingRole === Role.TEACHER) {
      const assignments = await this.prisma.teacherAssignment.findMany({
        where: { tenantId, teacherId: requestingUserId },
        select: { classRoomId: true },
      });

      where.role = Role.STUDENT;
      where.studentProfile = {
        is: { classRoomId: { in: assignments.map((assignment) => assignment.classRoomId) } },
      };
    } else if (role) {
      where.role = role;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        studentProfile: {
          include: { classRoom: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(tenantId: string, userId: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { studentProfile: true },
    });

    if (!existing) {
      throw new NotFoundException('User not found in this school');
    }

    return this.prisma.$transaction(async (tx) => {
      if (existing.studentProfile && dto.classRoomId) {
        await tx.studentProfile.update({
          where: { id: existing.studentProfile.id },
          data: { classRoomId: dto.classRoomId },
        });
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.firstName ? { firstName: dto.firstName.trim() } : {}),
          ...(dto.lastName ? { lastName: dto.lastName.trim() } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          studentProfile: { include: { classRoom: true } },
        },
      });
    });
  }

  async deleteUser(tenantId: string, userId: string, currentActorId: string) {
    if (userId === currentActorId) {
      throw new BadRequestException('You cannot delete your own active account');
    }

    const existing = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('User not found in this school');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { message: `${existing.firstName} ${existing.lastName} has been removed` };
  }

    async getMyPortal(tenantId: string, userId: string, role: Role) {
    const profileInclude = {
      user: { select: { firstName: true, lastName: true, email: true } },
      classRoom: true,
      reportCards: {
        where: { isPublished: true },
        include: { term: { include: { session: true } } },
        orderBy: { generatedAt: 'desc' as const },
      },
      invoices: {
        include: { term: { include: { session: true } } },
        orderBy: { createdAt: 'desc' as const },
      },
      attendanceRecords: {
        orderBy: { date: 'desc' as const },
        take: 10,
      },
    };

    if (role === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { tenantId, userId },
        include: profileInclude,
      });
      return { children: student ? [student] : [] };
    }

    if (role === Role.PARENT) {
      const links = await this.prisma.parentStudent.findMany({
        where: { tenantId, parentId: userId },
        include: { student: { include: profileInclude } },
      });
      return { children: links.map((l) => l.student) };
    }

    return { children: [] };
  }

}
