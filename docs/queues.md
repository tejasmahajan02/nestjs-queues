# NestJS Queues with BullMQ – Best Practices & Limitations

## Overview

This project demonstrates how to implement **efficient job queues in NestJS using BullMQ** while avoiding common pitfalls such as
* excessive Redis usage
* High costs on command-metered Redis services (like Upstash)
* Tight coupling between modules.

It includes best practices for modular design and scaling.

---

## 🚨 The Problem We Faced

When creating **one queue per module**, we ran into multiple issues:

1. **Excessive Redis Commands**

   * Each queue spawns its own `QueueScheduler`, background polling, stalled job detection, and event logging.
   * Even with no active jobs, multiple queues caused hundreds of commands per second, quickly exhausting Upstash free-tier limits (500k commands/month).

2. **High Costs**

   * Free-tier Redis billing could be exceeded in **a single day** due to multiple queues running background Lua scripts.

3. **Module Coupling Dilemma**

   * Creating a global `QueueService` centralizes job registration but introduces tight coupling: all modules depend on this service to enqueue jobs.

---

## ✅ What We Solved

### 1. Consolidate Queues

* Instead of one queue per module, **use a shared queue** for the entire application.
* Separate jobs logically via **job names/types** rather than creating multiple queues.

**Benefits:**

* Significantly reduces Redis traffic.
* Minimizes Upstash command usage.
* Keeps modules logically decoupled while using a single shared queue.

### 2. Module-Level Producers & Workers

* Each module injects the shared queue and handles **its own job producers and workers**.
* Example:

```ts
await queue.add(JobNames.MAIL_SEND, { to, subject, body });
```

* Workers filter jobs by `job.name` so modules only process their own jobs.

### 3. Job Name Constants

* Centralized or per-module constants prevent typos:

```ts
export const MailJobNames = {
  MAIL_SEND: 'mail.send',
  NOTIFY: 'mail.notify',
} as const;
```

### 4. Queue Module

* Created a **self-contained `QueueModule`** that registers the shared queue and connection.
* Exported the queue provider so any feature module can inject it without duplicating setup.

```ts
import { Module } from '@nestjs/common';
import { APP_QUEUE } from './constants/variables.constant';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: APP_QUEUE,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: parseInt(process.env.BULL_REMOVE_FAILED ?? '100', 10), // fallback to 100 if env missing
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

```

### 5. Avoid Global God Services

* No central job registrar required.
* Each module owns its own producers and workers, maintaining **modularity**.

---

## ⚙️ How It Works

**Job Flow:**

1. Module injects shared queue.
2. Module adds job:

```ts
queue.add(JobNames.MAIL_SEND, { to, subject });
```

3. Module worker listens to the queue:

```ts
if (job.name === JobNames.MAIL_SEND) handleMail(job.data);
```

4. Scheduler handles delayed/retries for the shared queue (only **one scheduler**).

**Key Points:**

* Only **1 queue** → one scheduler, minimal Redis commands.
* Multiple workers can scale horizontally.
* Jobs remain **modular and decoupled** by name/type.

---

## 🔧 Advanced Worker Options (Optional)

For development or low-traffic environments, you can **tune worker settings** to reduce Redis command usage:

```ts
@Processor(APP_QUEUE, {
  stalledInterval: 120_000, // check for stalled jobs every 2 minutes instead of the default ~30s
  lockDuration: 30_000,     // how long a job lock lasts
  concurrency: 1,           // process one job at a time per worker
})
export class MailProcessor extends WorkerHost{
}
```

**Notes:**

* `stalledInterval`: Increase this to reduce Redis polling for stalled jobs in low-traffic environments.
* `lockDuration`: Default is fine; adjust only if jobs may take longer than expected.
* `concurrency`: Lowering concurrency reduces simultaneous Redis commands.
* These settings are **optional** — in production, you can revert to default values for better throughput.

This makes it clear for developers that **they can tune workers** to minimize Redis load without affecting the shared queue architecture.

---

## ⚡ Optional: Dedicated Queue Example

Sometimes you may need a **separate queue** for strict rate-limits, retries, or isolation:

```ts
@Module({
  imports: [
    BullModule.registerQueue({
      name: MAIL_QUEUE,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: undefined, // keep failed jobs; use a dead-letter queue to manually requeue if needed
      },
      connection: new IORedis(process.env.REDIS_URL), // dedicated Redis connection for high traffic
    }),
  ],
  providers: [MailProcessor, MailProducer],
  exports: [MailProducer],
})
export class MailModule {}
```

**Notes:**

* Import this module in your feature module instead of the shared queue.
* Use a dedicated queue **only when requirements cannot be met** by the shared queue.
* A dedicated Redis connection is recommended for high-traffic queues to avoid blocking other jobs.

---

## ⚠️ Limitations & Considerations

1. **Redis Command Billing**

   * Every queue adds background commands (EVALSHA, LRANGE, SMEMBERS, etc.).
   * Free-tier services like Upstash can be exhausted quickly if multiple queues are created.

2. **Job Isolation**

   * Using a shared queue means all jobs share the same Redis connection and scheduler.
   * If a module needs strict isolation (e.g., separate retry policies or rate limits), creating a dedicated queue may still be justified.

3. **Scaling**

   * Horizontal scaling works via multiple workers per queue.
   * Adding more queues only for scaling increases Redis load unnecessarily.

---

## 💡 Best Practices

1. **Use one shared queue per service/application**.
2. **Separate jobs by `job.name`** instead of separate queues.
3. **Module-level producers and workers** → modules remain decoupled.
4. **QueueModule manages connection + scheduler** → import in feature modules.
5. **Job names as constants** → avoids typos and ensures maintainability.
6. **Only create separate queues if truly necessary** (different rate limits, retries, or isolation).
7. **Monitor stalled jobs and Redis command usage** regularly.

---

## 📈 Scaling Recommendations

* **Horizontal Scaling**: Increase the number of workers, not queues.
* **Job Prioritization & Delays**: Use job options for rate-limiting or scheduling.
* **Batch Jobs**: Reduce job volume and Redis operations.
* **Monitoring**: Keep an eye on stalled jobs, command usage, and latency.
* Separate Redis connection for each queue.
---

## ⚡ TL;DR

* Multiple queues = **high Redis traffic & costs**.
Shared queue + job names/types (JobNames constants) = efficient, scalable, and modular.
* Feature modules own their **producers & workers** → low coupling.
* Create new queues **only when necessary**, otherwise stick with one shared queue.

---

## References

* [BullMQ Documentation](https://docs.bullmq.io/guide/nestjs) – official job queue library.
* [NestJS Bull Module](https://docs.nestjs.com/techniques/queues) – integration guide.
* [Upstash Redis](https://upstash.com/) – serverless Redis with command-limited free-tier.

---

