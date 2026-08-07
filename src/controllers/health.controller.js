const db = require("../config/db");
const redis = require("../config/redis");

async function checkOne(fn) {
  try {
    await fn();
    return "healthy";
  } catch {
    return "unhealthy";
  }
}

async function getHealth(req, res) {
  const [write, read, redisStatus] = await Promise.all([
    checkOne(db.pingPrimary),
    checkOne(db.pingSecondary),
    checkOne(redis.ping),
  ]);

  const body = { write, read, redis: redisStatus };
  const allHealthy =
    write === "healthy" && read === "healthy" && redisStatus === "healthy";

  res.status(allHealthy ? 200 : 503).json(body);
}

module.exports = { getHealth };
