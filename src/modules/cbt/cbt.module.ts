import { Module } from '@nestjs/common';
import { CbtController } from './cbt.controller.js';
import { CbtService } from './cbt.service.js';

@Module({
  controllers: [CbtController],
  providers: [CbtService],
})
export class CbtModule {}
