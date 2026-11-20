import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AssignTeacherDto,
  CreateClassRoomDto,
  CreateSessionDto,
  CreateSubjectDto,
  CreateTermDto,
} from './dto/academics.dto.js';

@Injectable()
export class AcademicsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(tenantId: string, dto: CreateSessionDto) {
    if (dto.isCurrent) {
      await this.prisma.academicSession.updateMany({
        where: { tenantId },
        data: { isCurrent: false },
      });
    }

    return this.prisma.academicSession.create({
      data: {
        tenantId,
        name: dto.name,
        isCurrent: dto.isCurrent ?? false,
      },
    });
  }

  async createTerm(tenantId: string, dto: CreateTermDto) {
    const session = await this.prisma.academicSession.findFirst({
      where: { id: dto.sessionId, tenantId },
    });
    if (!session) {
      throw new BadRequestException('Academic session not found for this school');
    }

    if (dto.isCurrent) {
      await this.prisma.term.updateMany({
        where: { tenantId },
        data: { isCurrent: false },
      });
    }

    return this.prisma.term.create({
      data: {
        tenantId,
        sessionId: dto.sessionId,
        name: dto.name,
        isCurrent: dto.isCurrent ?? false,
      },
    });
  }

  async createClassRoom(tenantId: string, dto: CreateClassRoomDto) {
    return this.prisma.classRoom.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        arm: dto.arm?.trim() || null,
      },
    });
  }

  async listClassRooms(tenantId: string) {
    return this.prisma.classRoom.findMany({
      where: { tenantId },
      include: { _count: { select: { students: true } } },
      orderBy: [{ name: 'asc' }, { arm: 'asc' }],
    });
  }

  async createSubject(tenantId: string, dto: CreateSubjectDto) {
    return this.prisma.subject.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        code: dto.code?.trim().toUpperCase(),
      },
    });
  }

  async assignTeacher(tenantId: string, dto: AssignTeacherDto) {
    const existing = await this.prisma.teacherAssignment.findUnique({
      where: {
        tenantId_teacherId_classRoomId_subjectId: {
          tenantId,
          teacherId: dto.teacherId,
          classRoomId: dto.classRoomId,
          subjectId: dto.subjectId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Teacher is already assigned to this subject and class');
    }

    return this.prisma.teacherAssignment.create({
      data: { tenantId, ...dto },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classRoom: true,
        subject: true,
      },
    });
  }

  async getAcademicOverview(tenantId: string, userId: string, role: Role) {
    const sessionsPromise = this.prisma.academicSession.findMany({
        where: { tenantId },
        include: { terms: true },
        orderBy: { name: 'desc' },
      });

    if (role === Role.TEACHER) {
      const [sessions, assignments] = await Promise.all([
        sessionsPromise,
        this.prisma.teacherAssignment.findMany({
          where: { tenantId, teacherId: userId },
          include: { classRoom: true, subject: true },
        }),
      ]);
      const classes = Array.from(
        new Map(assignments.map((assignment) => [assignment.classRoomId, assignment.classRoom])).values(),
      ).sort((a, b) => a.name.localeCompare(b.name) || (a.arm || '').localeCompare(b.arm || ''));
      const subjects = Array.from(
        new Map(assignments.map((assignment) => [assignment.subjectId, assignment.subject])).values(),
      ).sort((a, b) => a.name.localeCompare(b.name));

      return {
        sessions,
        classes,
        subjects,
        teacherAssignments: assignments.map(({ classRoomId, subjectId }) => ({
          classRoomId,
          subjectId,
        })),
      };
    }

    const [sessions, classes, subjects] = await Promise.all([
      sessionsPromise,
      this.listClassRooms(tenantId),
      this.prisma.subject.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    ]);

    return { sessions, classes, subjects, teacherAssignments: [] };
  }

  async deleteSession(tenantId: string, id: string) {
    const session = await this.prisma.academicSession.findFirst({ where: { id, tenantId } });
    if (!session) throw new BadRequestException('Academic session not found');
    await this.prisma.academicSession.delete({ where: { id } });
    return { message: 'Academic session deleted' };
  }

  async deleteTerm(tenantId: string, id: string) {
    const term = await this.prisma.term.findFirst({ where: { id, tenantId } });
    if (!term) throw new BadRequestException('Term not found');
    await this.prisma.term.delete({ where: { id } });
    return { message: 'Term deleted' };
  }

  async deleteClassRoom(tenantId: string, id: string) {
    const classroom = await this.prisma.classRoom.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { students: true } } },
    });
    if (!classroom) throw new BadRequestException('Classroom not found');
    if (classroom._count.students > 0) {
      throw new BadRequestException('Cannot delete a class that still has enrolled students');
    }
    await this.prisma.classRoom.delete({ where: { id } });
    return { message: 'Classroom deleted' };
  }

  async deleteSubject(tenantId: string, id: string) {
    const subject = await this.prisma.subject.findFirst({ where: { id, tenantId } });
    if (!subject) throw new BadRequestException('Subject not found');
    await this.prisma.subject.delete({ where: { id } });
    return { message: 'Subject deleted' };
  }

    async getTeacherAssignments(tenantId: string, teacherId: string) {
    return this.prisma.teacherAssignment.findMany({
      where: { tenantId, teacherId },
      include: {
        classRoom: true,
        subject: true,
      },
    });
  }

}
