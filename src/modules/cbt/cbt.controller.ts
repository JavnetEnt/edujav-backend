import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser, JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CbtService } from './cbt.service';
import { GenerateCbtDto, SubmitCbtDto } from './dto/cbt.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('cbt')
export class CbtController {
  constructor(private readonly cbtService: CbtService) {}

  @Roles(Role.TEACHER)
  @Post('generate')
  generateQuiz(@CurrentUser() user: JwtUserPayload, @Body() dto: GenerateCbtDto) {
    return this.cbtService.generateCbtFromTopics(user.tenantId, user.sub, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT)
  @Get('quizzes')
  listQuizzes(
    @CurrentUser() user: JwtUserPayload,
    @Query('classRoomId') classRoomId: string,
    @Query('termId') termId: string,
  ) {
    return this.cbtService.listQuizzesForClass(user.tenantId, classRoomId, termId);
  }

  @Roles(Role.STUDENT)
  @Post('quizzes/:id/submit')
  submitAttempt(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') quizId: string,
    @Body() dto: SubmitCbtDto,
  ) {
    return this.cbtService.submitStudentAttempt(
      user.tenantId,
      user.sub,
      quizId,
      dto.answers,
    );
  }
}
