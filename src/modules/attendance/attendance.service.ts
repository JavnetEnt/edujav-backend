import { Injectable } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MarkClassAttendanceDto } from './dto/attendance.dto.js';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async markClassAttendance(
    tenantId: string,
    teacherId: string,
    dto: MarkClassAttendanceDto,
  ) {
    const attendanceDate = new Date(dto.date);

    const saved = await this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of dto.records) {
        const record = await tx.attendanceRecord.upsert({
          where: {
            tenantId_studentId_date: {
              tenantId,
              studentId: item.studentId,
              date: attendanceDate,
            },
          },
          update: {
            status: item.status,
            remark: item.remark,
            markedBy: teacherId,
          },
          create: {
            tenantId,
            studentId: item.studentId,
            classRoomId: dto.classRoomId,
            termId: dto.termId,
            date: attendanceDate,
            status: item.status,
            remark: item.remark,
            markedBy: teacherId,
          },
        });
        results.push(record);
      }

      return results;
    });

    // Identify ABSENT or LATE students to trigger instant parent alerts
    const flaggedIds = dto.records
      .filter((r) => r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.LATE)
      .map((r) => r.studentId);

    let parentAlertsQueued = 0;

    if (flaggedIds.length > 0) {
      const flaggedStudents = await this.prisma.studentProfile.findMany({
        where: { id: { in: flaggedIds }, tenantId },
        include: {
          user: { select: { firstName: true, lastName: true } },
          parents: { include: { parent: { select: { email: true, phone: true } } } },
        },
      });

      for (const student of flaggedStudents) {
        const status = dto.records.find((r) => r.studentId === student.id)?.status;
        if (student.parents.length > 0) {
          parentAlertsQueued += student.parents.length;
          // Hook point for Termii SMS / WhatsApp Cloud API / Resend Email
          await this.prisma.auditLog.create({
            data: {
              tenantId,
              actorId: teacherId,
              action: 'PARENT_ATTENDANCE_ALERT',
              details: `Alert queued for ${student.user.firstName} ${student.user.lastName} (${status} on ${dto.date})`,
            },
          });
        }
      }
    }

    return {
      message: `Attendance recorded for ${saved.length} students`,
      date: dto.date,
      parentAlertsTriggered: parentAlertsQueued,
    };
  }

  async getProprietorDashboardStats(tenantId: string, termId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalStudents, totalTeachers, todayAttendance, invoices, recentLogs] =
      await Promise.all([
        this.prisma.studentProfile.count({ where: { tenantId } }),
        this.prisma.user.count({ where: { tenantId, role: 'TEACHER' } }),
        this.prisma.attendanceRecord.findMany({
          where: { tenantId, date: today },
        }),
        this.prisma.studentInvoice.findMany({
          where: { tenantId, termId },
        }),
        this.prisma.auditLog.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    const presentToday = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE,
    ).length;

    const totalExpected = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);

    return {
      studentsCount: totalStudents,
      teachersCount: totalTeachers,
      todayAttendanceRate:
        todayAttendance.length > 0
          ? `${((presentToday / todayAttendance.length) * 100).toFixed(1)}%`
          : 'No roll call yet',
      finance: {
        totalExpected,
        totalCollected,
        outstanding: totalExpected - totalCollected,
      },
      recentActivity: recentLogs,
    };
  }
}
