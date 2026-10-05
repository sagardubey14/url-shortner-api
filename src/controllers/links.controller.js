const Url = require("../models/url.model");
const redisClient = require("../config/redis");
const { cacheKey } = require("../utils/cache-key");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function positiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

async function listLinks(req, res) {
  const page = positiveInt(req.query.page, 1);
  const limit = Math.min(
    positiveInt(req.query.limit, DEFAULT_LIMIT),
    MAX_LIMIT,
  );
  const filter = { userId: req.userId, isActive: true };

  // Dashboard read: replication lag is acceptable, so use a secondary.
  const [links, total] = await Promise.all([
    Url.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .read("secondary")
      .lean(),
    Url.countDocuments(filter).read("secondary"),
  ]);

  res.json({ links, page, limit, total });
}

async function deleteLink(req, res) {
  const { code } = req.params;

  const url = await Url.findOneAndUpdate(
    { shortCode: code, userId: req.userId, isActive: true },
    { isActive: false },
  );
  if (!url) {
    return res.status(404).json({ error: "Short URL not found" });
  }

  await redisClient.delCache(cacheKey(code));
  res.status(204).end();
}

module.exports = { listLinks, deleteLink };
