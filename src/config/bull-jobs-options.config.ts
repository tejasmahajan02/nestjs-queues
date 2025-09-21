import { JobsOptions, WorkerOptions } from 'bullmq';

export const getDefaultJobOptions = (): JobsOptions => ({
  removeOnComplete: true,
  removeOnFail: parseInt(process.env.BULL_REMOVE_FAILED ?? '100', 10),
});

export const getWorkerOptions = (): Partial<WorkerOptions> => ({
  stalledInterval: 120000,
  lockDuration: 30000,
  concurrency: 1,
});
