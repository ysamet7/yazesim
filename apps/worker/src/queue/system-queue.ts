import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import type { WorkerEnv } from '@yazesim/shared/env';
import { Queue, Worker, type Job } from 'bullmq';
import { WORKER_ENV } from '../config/env.js';
import { redisConnection } from './connection.js';

/** The queue for housekeeping jobs. Later phases add their own queues. */
export const SYSTEM_QUEUE = 'system';

/** How long shutdown waits for running jobs before cutting the connections. */
export const SHUTDOWN_GRACE_MS = 10_000;
/** How long shutdown waits when Redis was never reached (nothing can be running). */
const UNCONNECTED_GRACE_MS = 2_000;

/**
 * Runs `close`; when it has not finished after `graceMs` (e.g. Redis is
 * unreachable and the client keeps reconnecting), cuts the connection with
 * `disconnect` so shutdown never hangs. Resolves true when `close` finished.
 */
export async function closeWithin(
  close: () => Promise<void>,
  disconnect: () => Promise<void>,
  graceMs: number,
): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<false>((resolve) => {
    timer = setTimeout(() => {
      resolve(false);
    }, graceMs);
  });
  const closed = close().then(
    () => true as const,
    () => true as const,
  );
  const finished = await Promise.race([closed, expired]);
  clearTimeout(timer);
  // Not awaited: BullMQ's disconnect waits for a connection that may never come.
  if (!finished) disconnect().catch(() => undefined);
  return finished;
}

/** Job names of the system queue and their results. */
export interface SystemJobs {
  /** Round trip through Redis and the worker; used by tests and operators. */
  ping: { result: { pong: true } };
}

export type SystemJobName = keyof SystemJobs;

export function processSystemJob(job: Pick<Job, 'name'>): SystemJobs[SystemJobName]['result'] {
  if (job.name === 'ping') return { pong: true };
  // An unknown job fails visibly instead of being dropped silently.
  throw new Error(`Unknown system job: ${job.name}`);
}

/**
 * Owns the system queue and its worker. Job data never carries chat content
 * or secrets: jobs reference database rows by id (golden rule 7).
 */
@Injectable()
export class SystemQueue implements OnModuleInit, OnApplicationShutdown {
  readonly queue: Queue;
  private worker: Worker | undefined;
  /** Whether the worker ever reached Redis; if not, shutdown has nothing to wait for. */
  private connected = false;
  private readonly logger = new Logger(SystemQueue.name);
  private readonly env: WorkerEnv;

  constructor(@Inject(WORKER_ENV) env: WorkerEnv) {
    this.env = env;
    this.queue = new Queue(SYSTEM_QUEUE, {
      connection: redisConnection(env.REDIS_URL),
      prefix: env.QUEUE_PREFIX,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: { age: 24 * 3600, count: 1_000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });
    this.queue.on('error', (error) => {
      this.logger.warn({ err: { name: error.name } }, 'System queue connection error');
    });
  }

  onModuleInit(): void {
    this.worker = new Worker(SYSTEM_QUEUE, (job) => Promise.resolve(processSystemJob(job)), {
      connection: redisConnection(this.env.REDIS_URL),
      prefix: this.env.QUEUE_PREFIX,
      concurrency: 4,
    });
    this.worker.on('failed', (job, error) => {
      this.logger.warn(
        { jobName: job?.name, jobId: job?.id, err: { name: error.name, message: error.message } },
        'System job failed',
      );
    });
    this.worker.on('ready', () => {
      this.connected = true;
    });
    // Connection errors are retried by the client; log them without the URL.
    this.worker.on('error', (error) => {
      this.logger.warn({ err: { name: error.name } }, 'System worker error');
    });
  }

  /** Whether the worker is consuming jobs (readiness). */
  isRunning(): boolean {
    return this.worker?.isRunning() ?? false;
  }

  async onApplicationShutdown(): Promise<void> {
    // Lets the running jobs finish, then closes both connections. Without a
    // connection no job can be running, so the worker closes at once.
    const grace = this.connected ? SHUTDOWN_GRACE_MS : UNCONNECTED_GRACE_MS;
    const worker = this.worker;
    if (worker) {
      await closeWithin(
        () => worker.close(!this.connected),
        () => worker.disconnect(),
        grace,
      );
    }
    await closeWithin(
      () => this.queue.close(),
      () => this.queue.disconnect(),
      grace,
    );
  }
}
