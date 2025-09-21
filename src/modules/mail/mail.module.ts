import { Module } from '@nestjs/common';
import { MailProducer } from './mail.producer';
import { MailProcessor } from './mail.processor';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [MailProducer, MailProcessor],
})
export class MailModule {}
