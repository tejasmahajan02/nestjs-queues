import { Global, Module } from '@nestjs/common';
import { APP_QUEUE } from './constants/variables.constant';
import { BullModule } from '@nestjs/bullmq';
import { getDefaultJobOptions } from 'src/config/bull-jobs-options.config';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: APP_QUEUE,
      defaultJobOptions: getDefaultJobOptions(),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
