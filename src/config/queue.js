const IORedis = require("ioredis");
const { Queue } = require("bullmq");
const env = require("./env");

const CLICK_QUEUE = "click-analytics";
const METADATA_QUEUE = "link-metadata";
// BullMQ: a higher number means lower priority. Clicks must never starve
// more important jobs (e.g. metadata fetches).
const CLICK_JOB_PRIORITY = 10;

const queues = new Map();

// BullMQ workers require maxRetriesPerRequest: null on their connection.
function createWorkerConnection() {
  return new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
}

function getQueue(name, defaultJobOptions) {
  if (!queues.has(name)) {
    const queue = new Queue(name, {
      // Fail fast when Redis is unreachable instead of buffering adds forever.
      connection: new IORedis(env.redisUrl, { enableOfflineQueue: false }),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 1000,
        ...defaultJobOptions,
      },
    });
    // Queue errors must not crash the API; requests don't depend on them.
    queue.on("error", () => {});
    queues.set(name, queue);
  }
  return queues.get(name);
}

function enqueueClick(click) {
  return getQueue(CLICK_QUEUE, { priority: CLICK_JOB_PRIORITY }).add(
    "click",
    click,
  );
}

function enqueueMetadata(link) {
  return getQueue(METADATA_QUEUE, {
    backoff: { type: "exponential", delay: 5000 },
  }).add("fetch-metadata", link);
}

module.exports = {
  CLICK_QUEUE,
  METADATA_QUEUE,
  createWorkerConnection,
  enqueueClick,
  enqueueMetadata,
};
