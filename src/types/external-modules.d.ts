// src/types/external-modules.d.ts
// Ambient module declarations for external libraries

declare module "bullmq" {
  export interface Job<T = any> {
    id?: string;
    name: string;
    data: T;
    attemptsMade: number;
    opts: {
      attempts?: number;
      delay?: number;
      [key: string]: any;
    };
  }

  export interface WorkerOptions {
    connection?: any;
    concurrency?: number;
  }

  export class Worker<T = any> {
    constructor(
      name: string,
      processor: (job: Job<T>) => Promise<any>,
      options?: WorkerOptions,
    );
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export interface QueueOptions {
    connection?: any;
    defaultJobOptions?: {
      attempts?: number;
      backoff?: {
        type: string;
        delay: number;
      };
      removeOnComplete?: boolean;
      removeOnFail?: boolean;
    };
  }

  export class Queue<T = any> {
    constructor(name: string, options?: QueueOptions);
    add(name: string, data: T, opts?: any): Promise<Job<T>>;
  }
}

declare module "resend" {
  export class Resend {
    constructor(apiKey?: string);
    emails: {
      send(payload: {
        from: string;
        to: string | string[];
        subject: string;
        text?: string;
        html?: string;
      }): Promise<{ data?: any; error?: { message: string } | null }>;
    };
  }
}
