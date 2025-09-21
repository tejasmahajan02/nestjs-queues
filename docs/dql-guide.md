## 1️⃣ constants/job-names.constant.ts

```ts
export const MailJobNames = {
  MAIL_SEND: 'mail.send',
} as const;

export const MailDLQ = 'mail-dlq';
```

---

## 2️⃣ queue/mail-queue.module.ts

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailProducer } from './mail-producer.service';
import { MailProcessor } from './mail-processor.service';
import { MailJobNames, MailDLQ } from '../constants/job-names.constant';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL);

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mail',
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: 5000, // retry 5s between attempts
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    BullModule.registerQueue({
      name: MailDLQ,
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
  ],
  providers: [MailProducer, MailProcessor],
  exports: [MailProducer],
})
export class MailQueueModule {}
```

---

## 3️⃣ queue/mail-producer.service.ts

```ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MailJobNames } from '../constants/job-names.constant';

@Injectable()
export class MailProducer {
  constructor(@InjectQueue('mail') private readonly mailQueue: Queue) {}

  async sendMail(to: string, subject: string, body: string) {
    await this.mailQueue.add(MailJobNames.MAIL_SEND, { to, subject, body });
  }
}
```

---

## 4️⃣ queue/mail-processor.service.ts

```ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { MailJobNames, MailDLQ } from '../constants/job-names.constant';
import { Injectable } from '@nestjs/common';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL);

@Injectable()
@Processor('mail')
export class MailProcessor extends WorkerHost {
  constructor(@InjectQueue(MailDLQ) private readonly dlqQueue: Queue) {
    super();
  }

  async process(job: Job) {
    if (job.name === MailJobNames.MAIL_SEND) {
      try {
        // Simulate sending mail
        console.log(`Sending mail to ${job.data.to} with subject "${job.data.subject}"`);
        if (Math.random() < 0.3) throw new Error('Random mail failure'); // simulate failure
      } catch (err) {
        console.error(`Job failed: ${job.id}`, err.message);

        // Move to DLQ
        await this.dlqQueue.add(job.name, job.data, {
          attempts: 0,
          failedReason: err.message,
        });

        throw err; // mark original job as failed
      }
    }
  }
}
```

---

## 5️⃣ queue/mail-dlq-processor.service.ts (Optional DLQ worker)

```ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { MailDLQ } from '../constants/job-names.constant';

@Injectable()
@Processor(MailDLQ)
export class MailDLQProcessor extends WorkerHost {
  async process(job: Job) {
    console.log(`Processing DLQ job ${job.id}`, job.data);
    // Optional: retry, alert, or manual handling logic here
  }
}
```

---

### ✅ How it Works

1. **Producer** adds jobs to the `mail` queue.
2. **Worker** processes jobs; on failure, moves them to `mail-dlq`.
3. **DLQ Worker** can process or inspect failed jobs separately.
4. Main queue remains clean; failed jobs are tracked for later handling.

---

This setup ensures:

* Minimal Redis traffic for the main queue.
* Failed jobs are **not lost**.
* Optional retry or manual intervention for DLQ jobs.
* Modular structure: producers/workers are feature-level, not global.
