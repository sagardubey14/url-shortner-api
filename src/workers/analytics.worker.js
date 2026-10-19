const { Worker } = require("bullmq");
const db = require("../config/db");
const { CLICK_QUEUE, createWorkerConnection } = require("../config/queue");
const logger = require("../utils/logger");
const { ClickBatcher } = require("../services/click-batcher");
const { flushClicks } = require("../services/click-flush.service");

const BATCH_SIZE = 1000;
const FLUSH_INTERVAL_MS = 5000;

async function start() {
  await db.connect();

  const batcher = new ClickBatcher({
    maxSize: BATCH_SIZE,
    intervalMs: FLUSH_INTERVAL_MS,
    flush: async (clicks) => {
      await flushClicks(clicks);
      logger.info({ count: clicks.length }, "Flushed click batch");
    },
  });

  // Each job waits on its batch's flush, so concurrency must allow a full
  // batch of in-flight jobs. A job is acked only once its click is persisted.
  const worker = new Worker(CLICK_QUEUE, (job) => batcher.add(job.data), {
    connection: createWorkerConnection(),
    concurrency: BATCH_SIZE,
  });
  worker.on("failed", (job, err) =>
    logger.warn({ err, jobId: job?.id }, "Click job failed"),
  );
  worker.on("error", (err) => logger.error({ err }, "Worker error"));
  logger.info("Click analytics worker started");

  const shutdown = async () => {
    await worker.close();
    await batcher.close();
    await db.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  logger.error({ err }, "Failed to start worker");
  process.exit(1);
});
