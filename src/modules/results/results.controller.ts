import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser, JwtUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import {
  BulkRecordScoresDto,
  GenerateBroadsheetDto,
  UpdateRemarksDto,
} from './dto/results.dto.js';
import { ResultsService } from './results.service.js';

@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  // Public QR Verification Endpoint (Scannable directly from PDF Report Card)
  @Get('verify/:code')
  verifyResult(@Param('code') code: string) {
    return this.resultsService.verifyReportCardByCode(code);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.TEACHER)
  @Post('scores')
  recordScores(@CurrentUser() user: JwtUserPayload, @Body() dto: BulkRecordScoresDto) {
    return this.resultsService.recordScores(user.tenantId, user.sub, user.role, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.TEACHER)
  @Post('broadsheet/generate')
  generateBroadsheet(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: GenerateBroadsheetDto,
  ) {
    return this.resultsService.generateClassBroadsheet(
      user.tenantId,
      dto,
      user.role === Role.TEACHER ? user.sub : undefined,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT)
  @Get('report-card/:studentId')
  getReportCard(
    @CurrentUser() user: JwtUserPayload,
    @Param('studentId') studentId: string,
    @Query('termId') termId: string,
  ) {
    return this.resultsService.getStudentReportCard(user.tenantId, studentId, termId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.TEACHER)
  @Patch('report-card/:id/remarks')
  updateRemarks(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRemarksDto,
  ) {
    return this.resultsService.updateRemarks(user.tenantId, id, dto);
  }

}
