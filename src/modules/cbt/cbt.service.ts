import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class CbtService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Teacher Generates CBT Questions from Term Topics
  async generateCbtFromTopics(
    tenantId: string,
    teacherId: string,
    dto: {
      classRoomId: string;
      subjectId: string;
      termId: string;
      title: string;
      topicsCovered: string;
      questionCount?: number;
      durationMinutes?: number;
    },
  ) {
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        tenantId,
        teacherId,
        classRoomId: dto.classRoomId,
        subjectId: dto.subjectId,
      },
      include: { classRoom: true, subject: true },
    });

    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this class and subject');
    }

    const count = Math.min(Math.max(dto.questionCount || 10, 5), 30);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('CBT question generation is not configured');
    }

    const prompt = `You are a Nigerian school examiner preparing practice CBT questions for ${assignment.classRoom.name} students in ${assignment.subject.name}.
Topics taught this term: ${dto.topicsCovered}.

Generate exactly ${count} multiple-choice questions aligned with the Nigerian curriculum (NERDC / WAEC / BECE standard).
Return ONLY a valid JSON array with no markdown or extra text, formatted strictly as:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief explanation of why this answer is correct"
  }
]`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );

    if (!response.ok) {
      throw new BadGatewayException('CBT question generation service returned an error');
    }

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new BadGatewayException('Failed to generate CBT questions from AI service');
    }

    const parsedQuestions = JSON.parse(rawText);

    return this.prisma.cbtQuiz.create({
      data: {
        tenantId,
        classRoomId: dto.classRoomId,
        subjectId: dto.subjectId,
        termId: dto.termId,
        teacherId,
        title: dto.title.trim(),
        topicsCovered: dto.topicsCovered.trim(),
        durationMinutes: dto.durationMinutes || 20,
        questions: parsedQuestions,
      },
    });
  }

  // 2. List Available Practice Quizzes for a Class & Term
  async listQuizzesForClass(tenantId: string, classRoomId: string, termId: string) {
    return this.prisma.cbtQuiz.findMany({
      where: { tenantId, classRoomId, termId, isPublished: true },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Auto-Grade Student CBT Practice Submission
  async submitStudentAttempt(
    tenantId: string,
    userId: string,
    quizId: string,
    answers: number[], // Selected option index per question
  ) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { tenantId, userId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const quiz = await this.prisma.cbtQuiz.findFirst({
      where: { id: quizId, tenantId },
    });
    if (!quiz) {
      throw new NotFoundException('CBT Quiz not found');
    }

    const questions = quiz.questions as Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>;

    let score = 0;
    const corrections = questions.map((q, idx) => {
      const selected = answers[idx] ?? -1;
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) score++;
      return {
        question: q.question,
        selectedOption: selected >= 0 ? q.options[selected] : 'Not answered',
        correctOption: q.options[q.correctIndex],
        isCorrect,
        explanation: q.explanation,
      };
    });

    const percentage = Number(((score / questions.length) * 100).toFixed(1));

    const attempt = await this.prisma.cbtAttempt.create({
      data: {
        tenantId,
        quizId,
        studentId: student.id,
        score,
        totalQuestions: questions.length,
        percentage,
      },
    });

    return {
      attempt,
      corrections,
    };
  }
}
