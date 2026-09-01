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

async function getCache(key) {
  return redis.get(key);
}

async function setCache(key, value, ttlSeconds) {
  await redis.set(key, value, "EX", ttlSeconds);
}

module.exports = { redis, ping, getCache, setCache };
