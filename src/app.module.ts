import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AcademicsModule } from './modules/academics/academics.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ResultsModule } from './modules/results/results.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { CbtModule } from './modules/cbt/cbt.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AcademicsModule,
    UsersModule,
    ResultsModule,
    FinanceModule,
    AttendanceModule,
    CbtModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
