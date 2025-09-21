import { Module } from '@nestjs/common';
import { MailProducer } from './mail.producer';
import { MailProcessor } from './mail.processor';

@Module({
  imports: [],
  providers: [MailProducer, MailProcessor],
})
export class MailModule {}
