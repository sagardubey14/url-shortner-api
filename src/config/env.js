require("dotenv").config({ quiet: true });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: Number(required("PORT", "3000")),
  nodeEnv: required("NODE_ENV", "development"),
  mongoUri: required("MONGO_URI"),
  redisUrl: required("REDIS_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: required("JWT_EXPIRES_IN", "24h"),
};
