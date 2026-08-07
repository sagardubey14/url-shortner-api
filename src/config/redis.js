const Redis = require("ioredis");
const env = require("./env");

const redis = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

async function ping() {
  const reply = await redis.ping();
  if (reply !== "PONG") {
    throw new Error(`Unexpected Redis PING reply: ${reply}`);
  }
}

module.exports = { redis, ping };
