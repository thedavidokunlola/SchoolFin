// src/server/jobs/queues.ts
// Locked BullMQ queues configuration per PRD §6.5 and AGENTS.md §2.5

import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

// 1. notifications queue
export const notificationsQueue = new Queue("notifications", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 60 * 1000, // 1 min, 5 min, 15 min
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// 2. payments queue
export const paymentsQueue = new Queue("payments", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// 3. installments queue
export const installmentsQueue = new Queue("installments", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// 4. receipts queue
export const receiptsQueue = new Queue("receipts", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// 5. debt-collection queue
export const debtCollectionQueue = new Queue("debt-collection", {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// 6. reports queue
export const reportsQueue = new Queue("reports", {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
});
