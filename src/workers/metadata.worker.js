const { Worker } = require("bullmq");
const db = require("../config/db");
const { METADATA_QUEUE, createWorkerConnection } = require("../config/queue");
const logger = require("../utils/logger");
const { processMetadataJob } = require("../services/metadata.processor");

async function start() {
  await db.connect();

  const worker = new Worker(
    METADATA_QUEUE,
    (job) => processMetadataJob(job.data),
    {
      connection: createWorkerConnection(),
      concurrency: 5,
    },
  );
  worker.on("failed", (job, err) =>
    logger.warn({ err, jobId: job?.id }, "Metadata job failed"),
  );
  worker.on("error", (err) => logger.error({ err }, "Worker error"));
  logger.info("Metadata worker started");

  const shutdown = async () => {
    await worker.close();
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
