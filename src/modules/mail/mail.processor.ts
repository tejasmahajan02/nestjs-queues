import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { APP_QUEUE } from '../queue/constants/variables.constant';
import { Job } from 'bullmq';
import { MailJobNames } from './constants/mail-job.constant';
import { MailData } from './types/mail-data.type';
import { delay } from 'src/common/utils/helpers.util';
import { getWorkerOptions } from 'src/config/bull-jobs-options.config';

@Processor(APP_QUEUE, getWorkerOptions())
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor() {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      const { name, data } = job;

      switch (name) {
        case MailJobNames.SEND:
          await this.sendMail(data);
          break;
        default:
          this.logger.log(
            `Mail failed dispatched to: ${data.to}; No Job Matched.`,
          );
          break;
      }

      return {};
    } catch (error) {
      console.error(error);
    }
  }

  async sendMail(data: MailData): Promise<void> {
    await delay(3000); // optional delay, just to mimic real execution

    this.logger.log(`Mail sent : \n${JSON.stringify(data, null, 2)}`);
  }
}
