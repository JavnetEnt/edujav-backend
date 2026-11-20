import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser, JwtUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AcademicsService } from './academics.service.js';
import {
  AssignTeacherDto,
  CreateClassRoomDto,
  CreateSessionDto,
  CreateSubjectDto,
  CreateTermDto,
} from './dto/academics.dto.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('academics')
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Get('overview')
  getOverview(@CurrentUser() user: JwtUserPayload) {
    return this.academicsService.getAcademicOverview(
      user.tenantId,
      user.sub,
      user.role,
    );
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Post('sessions')
  createSession(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateSessionDto) {
    return this.academicsService.createSession(user.tenantId, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Post('terms')
  createTerm(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateTermDto) {
    return this.academicsService.createTerm(user.tenantId, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Post('classes')
  createClassRoom(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateClassRoomDto) {
    return this.academicsService.createClassRoom(user.tenantId, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Post('subjects')
  createSubject(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateSubjectDto) {
    return this.academicsService.createSubject(user.tenantId, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Post('assign-teacher')
  assignTeacher(@CurrentUser() user: JwtUserPayload, @Body() dto: AssignTeacherDto) {
    return this.academicsService.assignTeacher(user.tenantId, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Delete('sessions/:id')
  deleteSession(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.academicsService.deleteSession(user.tenantId, id);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Delete('terms/:id')
  deleteTerm(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.academicsService.deleteTerm(user.tenantId, id);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Delete('classes/:id')
  deleteClassRoom(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.academicsService.deleteClassRoom(user.tenantId, id);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Delete('subjects/:id')
  deleteSubject(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.academicsService.deleteSubject(user.tenantId, id);
  }

    @Roles(Role.TEACHER)
  @Get('my-assignments')
  getMyAssignments(@CurrentUser() user: JwtUserPayload) {
    return this.academicsService.getTeacherAssignments(user.tenantId, user.sub);
  }

}
