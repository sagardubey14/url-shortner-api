const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const env = require("../config/env");
const { redis } = require("../config/redis");

function createLimiter({ windowMs, limit, prefix }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Availability over strictness: if Redis is down, let requests through.
    passOnStoreError: true,
    handler: (req, res) => {
      res.status(429).json({ error: "Too many requests" });
    },
    // Tests use the in-memory store; real deployments share counters via Redis
    // so limits hold across API instances.
    ...(env.nodeEnv !== "test" && {
      store: new RedisStore({
        prefix: `rl:${prefix}:`,
        sendCommand: (...args) => redis.call(...args),
      }),
    }),
  });
}

const shortenLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  prefix: "shorten",
});

const apiLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 300,
  prefix: "api",
});

module.exports = { shortenLimiter, apiLimiter };
