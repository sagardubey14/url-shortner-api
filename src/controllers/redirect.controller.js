const Url = require("../models/url.model");
const redisClient = require("../config/redis");

const { recordClick } = require("../services/analytics.service");
const { cacheKey } = require("../utils/cache-key");

const CACHE_TTL_SECONDS = 24 * 60 * 60;

async function redirectShortUrl(req, res) {
  const { code } = req.params;

  const cachedLongUrl = await redisClient.getCache(cacheKey(code));
  if (cachedLongUrl) {
    recordClick(req, code);
    return res.redirect(301, cachedLongUrl);
  }

  const url = await Url.findOne({ shortCode: code, isActive: true });

  if (!url) {
    const deletedUrl = await Url.findOne({ shortCode: code, isActive: false });
    if (deletedUrl) {
      return res.status(410).json({ error: "This short URL has been deleted" });
    }
    return res.status(404).json({ error: "Short URL not found" });
  }

  await redisClient.setCache(cacheKey(code), url.longUrl, CACHE_TTL_SECONDS);

  recordClick(req, code);
  res.redirect(301, url.longUrl);
}

module.exports = { redirectShortUrl };
