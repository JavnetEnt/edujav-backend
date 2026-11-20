import { Module } from '@nestjs/common';
<<<<<<< HEAD
import { AcademicsController } from './academics.controller.js';
import { AcademicsService } from './academics.service.js';
=======
import { AcademicsController } from './academics.controller';
import { AcademicsService } from './academics.service';
import { TimetableService } from './timetable.service';
>>>>>>> ebd247a (Add AI CBT generator and smart 3-term timetable endpoints)

@Module({
  controllers: [AcademicsController],
  providers: [AcademicsService, TimetableService],
  exports: [AcademicsService, TimetableService],
})
export class AcademicsModule {}
