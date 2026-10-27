const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");
const logger = require("./utils/logger");
const healthRouter = require("./routes/health.routes");
const { apiLimiter } = require("./middlewares/rate-limit.middleware");
const analyticsRouter = require("./routes/analytics.routes");
const authRouter = require("./routes/auth.routes");
const linksRouter = require("./routes/links.routes");
const shortenRouter = require("./routes/shorten.routes");
const redirectRouter = require("./routes/redirect.routes");

const app = express();

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(cookieParser());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));

// Mounted before the "/:code" redirect route, which would otherwise shadow it.
app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/health", healthRouter);
app.use("/api", apiLimiter);
app.use("/api/auth", authRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/links", linksRouter);
app.use("/api/shorten", shortenRouter);
app.use("/", redirectRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
