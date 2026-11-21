import { Module } from '@nestjs/common';
import { AcademicsController } from './academics.controller.js';
import { AcademicsService } from './academics.service.js';
import { TimetableService } from './timetable.service.js';

@Module({
  controllers: [AcademicsController],
  providers: [AcademicsService, TimetableService],
  exports: [AcademicsService, TimetableService],
})
export class AcademicsModule {}
