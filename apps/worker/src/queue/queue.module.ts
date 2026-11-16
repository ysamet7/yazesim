import { Module } from '@nestjs/common';
import { SystemQueue } from './system-queue.js';

@Module({
  providers: [SystemQueue],
  exports: [SystemQueue],
})
export class QueueModule {}
