const app = require("./app");
const env = require("./config/env");
const db = require("./config/db");
const logger = require("./utils/logger");
const { ensureCounterSeeded } = require("./services/shorten.service");

async function start() {
  await db.connect();
  logger.info("Connected to MongoDB replica set");

  await ensureCounterSeeded();

  app.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`);
  });
}

start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
