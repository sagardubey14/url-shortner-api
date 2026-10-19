const IORedis = require("ioredis");
const { Queue } = require("bullmq");
const env = require("./env");

const CLICK_QUEUE = "click-analytics";
// BullMQ: a higher number means lower priority. Clicks must never starve
// more important jobs (e.g. metadata fetches) added later.
const CLICK_JOB_PRIORITY = 10;

let clickQueue;

// BullMQ workers require maxRetriesPerRequest: null on their connection.
function createWorkerConnection() {
  return new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
}

function getClickQueue() {
  if (!clickQueue) {
    clickQueue = new Queue(CLICK_QUEUE, {
      // Fail fast when Redis is unreachable instead of buffering adds forever.
      connection: new IORedis(env.redisUrl, { enableOfflineQueue: false }),
      defaultJobOptions: {
        priority: CLICK_JOB_PRIORITY,
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });
    // Queue errors must not crash the API; redirects don't depend on them.
    clickQueue.on("error", () => {});
  }
  return clickQueue;
}

function enqueueClick(click) {
  return getClickQueue().add("click", click);
}

module.exports = { CLICK_QUEUE, createWorkerConnection, enqueueClick };
