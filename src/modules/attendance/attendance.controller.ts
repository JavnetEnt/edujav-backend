import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser, JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AttendanceService } from './attendance.service';
import { MarkClassAttendanceDto } from './dto/attendance.dto';

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
