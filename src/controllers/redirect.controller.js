const Url = require("../models/url.model");
const redisClient = require("../config/redis");

const { recordClick } = require("../services/analytics.service");
const { cacheKey } = require("../utils/cache-key");

const CACHE_TTL_SECONDS = 24 * 60 * 60;

// Cache entries are JSON so a cache hit still knows the canonical short code
// (the requested code may be a custom alias). Plain-string entries written by
// older versions are still accepted.
function parseCached(value, code) {
  if (value.startsWith("{")) {
    try {
      return JSON.parse(value);
    } catch {
      // fall through to the plain-string form
    }
  }
  return { shortCode: code, longUrl: value };
}

const lookup = (code, isActive) => ({
  isActive,
  $or: [{ shortCode: code }, { customAlias: code }],
});

async function redirectShortUrl(req, res) {
  const { code } = req.params;

  const cached = await redisClient.getCache(cacheKey(code));
  if (cached) {
    const { shortCode, longUrl } = parseCached(cached, code);
    recordClick(req, shortCode);
    return res.redirect(301, longUrl);
  }

  const url = await Url.findOne(lookup(code, true));

  if (!url) {
    const deletedUrl = await Url.findOne(lookup(code, false));
    if (deletedUrl) {
      return res.status(410).json({ error: "This short URL has been deleted" });
    }
    return res.status(404).json({ error: "Short URL not found" });
  }

  // The Mongo TTL sweep runs about once a minute, so an expired link can
  // linger; never redirect to it.
  let ttlSeconds = CACHE_TTL_SECONDS;
  if (url.expiresAt) {
    const remainingMs = new Date(url.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      return res.status(410).json({ error: "This short URL has expired" });
    }
    ttlSeconds = Math.min(ttlSeconds, Math.ceil(remainingMs / 1000));
  }

  await redisClient.setCache(
    cacheKey(code),
    JSON.stringify({ shortCode: url.shortCode, longUrl: url.longUrl }),
    ttlSeconds,
  );

  recordClick(req, url.shortCode);
  res.redirect(301, url.longUrl);
}

module.exports = { redirectShortUrl };
