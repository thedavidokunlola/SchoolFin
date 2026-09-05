// worker/index.ts
// Background Worker Process for Railway / Render
// Locked per PRD §6.5 and AGENTS.md §2.5

import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { processGenerateReceiptPdf } from "./queues/receipts";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

console.log("🚀 Starting SchoolFin Background Worker process...");

// 1. Receipts Queue Worker (Puppeteer PDF generation)
const receiptsWorker = new Worker(
  "receipts",
  async (job: Job) => {
    if (job.name === "generate-receipt-pdf") {
      await processGenerateReceiptPdf(job);
    }
  },
  {
    connection,
    concurrency: 2,
  },
);

receiptsWorker.on("completed", (job: Job) => {
  console.log(`✅ [receipts] Job ${job.id} (${job.name}) completed.`);
});

receiptsWorker.on("failed", (job: Job | undefined, error: Error) => {
  console.error(`❌ [receipts] Job ${job?.id} (${job?.name}) failed:`, error);
});

console.log("⚡ Workers registered and listening for jobs.");
