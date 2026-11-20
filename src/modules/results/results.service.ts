import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, Score } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  BulkRecordScoresDto,
  GenerateBroadsheetDto,
  UpdateRemarksDto,
} from './dto/results.dto.js';

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Batch Record Subject Scores (Teacher or Admin)
  async recordScores(
    tenantId: string,
    recorderId: string,
    recorderRole: Role,
    dto: BulkRecordScoresDto,
  ) {
    // If TEACHER, verify they are actually assigned to this class & subject
       // Strictly verify the user is the assigned teacher for this class & subject
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        tenantId,
        teacherId: recorderId,
        classRoomId: dto.classRoomId,
        subjectId: dto.subjectId,
      },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'Access denied: Only the assigned subject teacher can record or modify scores',
      );
    }


    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { gradingScales: { orderBy: { minScore: 'desc' } } },
    });

    const results = await this.prisma.$transaction(async (tx) => {
      const savedScores: Score[] = [];


      for (const item of dto.scores) {
        const caTotal = item.ca1 + item.ca2;
        if (caTotal > tenant.caWeight) {
          throw new BadRequestException(
            `CA total (${caTotal}) exceeds school maximum CA weight (${tenant.caWeight})`,
          );
        }
        if (item.exam > tenant.examWeight) {
          throw new BadRequestException(
            `Exam score (${item.exam}) exceeds school maximum Exam weight (${tenant.examWeight})`,
          );
        }

        const total = Number((caTotal + item.exam).toFixed(2));
        const matchedScale = tenant.gradingScales.find(
          (g) => total >= g.minScore && total <= g.maxScore,
        );

        const record = await tx.score.upsert({
          where: {
            tenantId_studentId_subjectId_termId: {
              tenantId,
              studentId: item.studentId,
              subjectId: dto.subjectId,
              termId: dto.termId,
            },
          },
          update: {
            ca1: item.ca1,
            ca2: item.ca2,
            exam: item.exam,
            total,
            grade: matchedScale?.grade || 'F',
            remark: matchedScale?.remark || 'Fail',
            recordedBy: recorderId,
          },
          create: {
            tenantId,
            studentId: item.studentId,
            classRoomId: dto.classRoomId,
            subjectId: dto.subjectId,
            termId: dto.termId,
            ca1: item.ca1,
            ca2: item.ca2,
            exam: item.exam,
            total,
            grade: matchedScale?.grade || 'F',
            remark: matchedScale?.remark || 'Fail',
            recordedBy: recorderId,
          },
        });

        savedScores.push(record);
      }

      return savedScores;
    });

    return {
      message: `${results.length} student scores recorded and graded successfully`,
      count: results.length,
    };
  }

  // 2. Compute Class Broadsheet & Rank All Students
  async generateClassBroadsheet(
    tenantId: string,
    dto: GenerateBroadsheetDto,
    teacherId?: string,
  ) {
    if (teacherId) {
      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: { tenantId, teacherId, classRoomId: dto.classRoomId },
        select: { id: true },
      });
      if (!assignment) {
        throw new ForbiddenException(
          'You are not assigned to compute the broadsheet for this class',
        );
      }
    }

    const students = await this.prisma.studentProfile.findMany({
      where: { tenantId, classRoomId: dto.classRoomId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        scores: {
          where: { termId: dto.termId },
          include: { subject: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    if (!students.length) {
      throw new NotFoundException('No students found in this classroom');
    }

    // Calculate total and average per student
    const computed = students.map((student) => {
      const subjectCount = student.scores.length;
      const totalScore = student.scores.reduce((sum, s) => sum + s.total, 0);
      const averageScore =
        subjectCount > 0 ? Number((totalScore / subjectCount).toFixed(2)) : 0;

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        subjectCount,
        totalScore: Number(totalScore.toFixed(2)),
        averageScore,
        subjects: student.scores,
      };
    });

    // Sort highest average to lowest for standard competition ranking (1, 2, 2, 4)
    computed.sort((a, b) => b.averageScore - a.averageScore);

    const ranked = computed.map((item, idx, arr) => {
      const position =
        idx > 0 && item.averageScore === arr[idx - 1].averageScore
          ? arr.findIndex((x) => x.averageScore === item.averageScore) + 1
          : idx + 1;

      return { ...item, positionInClass: position };
    });

    // Persist ReportCard snapshots with unique QR verification codes
    await this.prisma.$transaction(
      ranked.map((r) =>
        this.prisma.reportCard.upsert({
          where: {
            tenantId_studentId_termId: {
              tenantId,
              studentId: r.studentId,
              termId: dto.termId,
            },
          },
          update: {
            totalScore: r.totalScore,
            averageScore: r.averageScore,
            positionInClass: r.positionInClass,
            totalStudents: ranked.length,
            ...(dto.publish !== undefined ? { isPublished: dto.publish } : {}),
          },
          create: {
            tenantId,
            studentId: r.studentId,
            classRoomId: dto.classRoomId,
            termId: dto.termId,
            totalScore: r.totalScore,
            averageScore: r.averageScore,
            positionInClass: r.positionInClass,
            totalStudents: ranked.length,
            isPublished: dto.publish ?? false,
          },
        }),
      ),
    );

    return {
      classRoomId: dto.classRoomId,
      termId: dto.termId,
      totalStudents: ranked.length,
      broadsheet: ranked,
    };
  }

  // 3. Get Full Student Report Card (For Student, Parent, or Printing)
  async getStudentReportCard(tenantId: string, studentId: string, termId: string) {
    const reportCard = await this.prisma.reportCard.findUnique({
      where: {
        tenantId_studentId_termId: { tenantId, studentId, termId },
      },
      include: {
        tenant: {
          select: { name: true, address: true, phone: true, logoUrl: true, primaryColor: true },
        },
        classRoom: true,
        term: { include: { session: true } },
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            scores: {
              where: { termId },
              include: { subject: true },
              orderBy: { subject: { name: 'asc' } },
            },
          },
        },
      },
    });

    if (!reportCard) {
      throw new NotFoundException('Report card has not been generated for this term yet');
    }

    return reportCard;
  }

  // 4. Add Form Teacher / Principal Remarks
  async updateRemarks(tenantId: string, reportCardId: string, dto: UpdateRemarksDto) {
    const existing = await this.prisma.reportCard.findFirst({
      where: { id: reportCardId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Report card not found');
    }

    return this.prisma.reportCard.update({
      where: { id: reportCardId },
      data: {
        ...(dto.teacherComment !== undefined ? { teacherComment: dto.teacherComment } : {}),
        ...(dto.principalComment !== undefined ? { principalComment: dto.principalComment } : {}),
      },
    });
  }

  // 5. Public QR Code Verification (No Auth Required!)
  async verifyReportCardByCode(verificationCode: string) {
    const card = await this.prisma.reportCard.findUnique({
      where: { verificationCode },
      include: {
        tenant: { select: { name: true, slug: true } },
        classRoom: { select: { name: true, arm: true } },
        term: { include: { session: { select: { name: true } } } },
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!card || !card.isPublished) {
      throw new NotFoundException('Invalid or unpublished result verification code');
    }

    return {
      verified: true,
      school: card.tenant.name,
      studentName: `${card.student.user.firstName} ${card.student.user.lastName}`,
      admissionNumber: card.student.admissionNumber,
      class: `${card.classRoom.name}${card.classRoom.arm ? ' ' + card.classRoom.arm : ''}`,
      session: card.term.session.name,
      term: card.term.name,
      averageScore: card.averageScore,
      position: `${card.positionInClass} of ${card.totalStudents}`,
      issuedAt: card.generatedAt,
    };
  }
}
