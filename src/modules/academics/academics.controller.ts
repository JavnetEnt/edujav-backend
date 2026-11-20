import {
  Body,
  CanActivate,
  Controller,
  createParamDecorator,
  Delete,
  ExecutionContext,
  Get,
  Param,
  Post,
  Query,
  SetMetadata,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AcademicsService } from './academics.service.js';

export interface JwtUserPayload {
  sub: string;
  tenantId: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtUserPayload =>
    context.switchToHttp().getRequest<{ user: JwtUserPayload }>().user,
);

import {
  AssignTeacherDto,
  CreateClassRoomDto,
  CreateSessionDto,
  CreateSubjectDto,
  CreateTermDto,
  GenerateTimetableDto,
} from './dto/academics.dto.js';
import { TimetableService } from './timetable.service.js';

const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

@Injectable()
class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const user = context.switchToHttp().getRequest<{ user?: JwtUserPayload }>().user;
    return !!user && roles.includes(user.role);
  }
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('academics')
export class AcademicsController {
  constructor(
    private readonly academicsService: AcademicsService,
    private readonly timetableService: TimetableService,
  ) {}


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

    @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Post('timetable/generate')
  generateTimetable(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: GenerateTimetableDto,
  ) {
    return this.timetableService.generateTermTimetable(user.tenantId, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT)
  @Get('timetable')
  getClassTimetable(
    @CurrentUser() user: JwtUserPayload,
    @Query('termId') termId: string,
    @Query('classRoomId') classRoomId: string,
  ) {
    return this.timetableService.getClassTimetable(user.tenantId, termId, classRoomId);
  }

}
