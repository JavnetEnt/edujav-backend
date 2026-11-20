import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { ResultsModule } from './modules/results/results.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AttendanceModule } from './modules/attendance/attendance.module';


@Module({
  imports: [PrismaModule, AuthModule, AcademicsModule, UsersModule, ResultsModule, FinanceModule, AttendanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

