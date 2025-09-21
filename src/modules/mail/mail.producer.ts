import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { APP_QUEUE } from '../queue/constants/variables.constant';
import { MailJobNames } from './constants/mail-job.constant';
import { MailData } from './types/mail-data.type';

@Injectable()
export class MailProducer {
  constructor(@InjectQueue(APP_QUEUE) private appQueue: Queue) {}

  async sendMail(mailData: MailData): Promise<void> {
    await this.appQueue.add(MailJobNames.SEND, mailData); // optional delay, just to mimic real execution
  }
}
