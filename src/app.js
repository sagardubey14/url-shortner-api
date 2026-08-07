const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");

const logger = require("./utils/logger");
const healthRouter = require("./routes/health.routes");

const app = express();

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(cookieParser());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/health", healthRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  req.log?.error({ err }, "Unhandled error");
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal server error" });
});

module.exports = app;
