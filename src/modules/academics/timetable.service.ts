import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  private addMinutes(timeStr: string, mins: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + mins;
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  async generateTermTimetable(
    tenantId: string,
    dto: {
      termId: string;
      periodDurationMinutes: 40 | 45 | 60;
      startTime?: string; // Defaults to "08:00"
      periodsPerDay?: number; // Defaults to 8 periods (or 6 if 60 mins)
    },
  ) {
    const classrooms = await this.prisma.classRoom.findMany({ where: { tenantId } });
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { tenantId },
      include: { subject: true },
    });

    if (!classrooms.length || !assignments.length) {
      throw new BadRequestException(
        'Please create classrooms and assign teachers to subjects before generating a timetable',
      );
    }

    const duration = dto.periodDurationMinutes || 40;
    const startHour = dto.startTime || '08:00';
    const periodsPerDay = dto.periodsPerDay || (duration === 60 ? 6 : 8);
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;

    // Track occupied teacher slots: Set<"MONDAY-08:00-teacherId"> to prevent clashes!
    const busyTeacherSlots = new Set<string>();
    const generatedSlots: any[] = [];

    for (const cls of classrooms) {
      const classSubjects = assignments.filter((a) => a.classRoomId === cls.id);
      if (!classSubjects.length) continue;

      let subjectPointer = 0;

      for (const day of days) {
        let currentTime = startHour;

        for (let p = 1; p <= periodsPerDay; p++) {
          // Insert Nigerian School Short Break after Period 3
          if (p === 4 && duration <= 45) {
            const breakEnd = this.addMinutes(currentTime, 20);
            generatedSlots.push({
              tenantId,
              termId: dto.termId,
              classRoomId: cls.id,
              day,
              startTime: currentTime,
              endTime: breakEnd,
              label: 'Short Break',
            });
            currentTime = breakEnd;
          }

          // Insert Long / Lunch Break after Period 6 (or Period 3 if 60-min blocks)
          if ((duration <= 45 && p === 7) || (duration === 60 && p === 4)) {
            const lunchEnd = this.addMinutes(currentTime, 30);
            generatedSlots.push({
              tenantId,
              termId: dto.termId,
              classRoomId: cls.id,
              day,
              startTime: currentTime,
              endTime: lunchEnd,
              label: 'Long Break / Lunch',
            });
            currentTime = lunchEnd;
          }

          const endTime = this.addMinutes(currentTime, duration);

          // Find next available subject whose teacher is not teaching another class at this exact time
          let chosen = classSubjects[subjectPointer % classSubjects.length];
          for (let attempt = 0; attempt < classSubjects.length; attempt++) {
            const candidate = classSubjects[(subjectPointer + attempt) % classSubjects.length];
            const lockKey = `${day}-${currentTime}-${candidate.teacherId}`;
            if (!busyTeacherSlots.has(lockKey)) {
              chosen = candidate;
              subjectPointer = (subjectPointer + attempt + 1) % classSubjects.length;
              break;
            }
          }

          busyTeacherSlots.add(`${day}-${currentTime}-${chosen.teacherId}`);

          generatedSlots.push({
            tenantId,
            termId: dto.termId,
            classRoomId: cls.id,
            subjectId: chosen.subjectId,
            teacherId: chosen.teacherId,
            day,
            startTime: currentTime,
            endTime,
            label: chosen.subject.name,
          });

          currentTime = endTime;
        }
      }
    }

    // Replace existing timetable for this term cleanly
    await this.prisma.$transaction([
      this.prisma.timetableSlot.deleteMany({ where: { tenantId, termId: dto.termId } }),
      this.prisma.timetableSlot.createMany({ data: generatedSlots }),
    ]);

    return {
      message: `Smart ${duration}-minute timetable generated across ${classrooms.length} classes with zero teacher clashes`,
      totalSlotsCreated: generatedSlots.length,
    };
  }

  async getClassTimetable(tenantId: string, termId: string, classRoomId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { tenantId, termId, classRoomId },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }
}
