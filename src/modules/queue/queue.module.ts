import { Module } from '@nestjs/common';
import { APP_QUEUE } from './constants/variables.constant';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: APP_QUEUE,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: parseInt(process.env.BULL_REMOVE_FAILED ?? '100', 10),
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
