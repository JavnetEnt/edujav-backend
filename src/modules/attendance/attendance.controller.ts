import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser, JwtUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AttendanceService } from './attendance.service.js';
import { MarkClassAttendanceDto } from './dto/attendance.dto.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.TEACHER)
  @Post('mark')
  markAttendance(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: MarkClassAttendanceDto,
  ) {
    return this.attendanceService.markClassAttendance(user.tenantId, user.sub, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.BURSAR)
  @Get('executive-summary')
  getExecutiveSummary(
    @CurrentUser() user: JwtUserPayload,
    @Query('termId') termId: string,
  ) {
    return this.attendanceService.getProprietorDashboardStats(user.tenantId, termId);
  }
}
