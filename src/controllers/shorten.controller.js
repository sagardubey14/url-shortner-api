const Url = require("../models/url.model");
const { getNextShortCode } = require("../services/shorten.service");
const { shortenSchema } = require("../validators/shorten.validator");

async function createShortUrl(req, res) {
  const parsed = shortenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const { longUrl, customAlias, tags } = parsed.data;

  if (customAlias) {
    const existing = await Url.findOne({ customAlias });
    if (existing) {
      return res.status(409).json({ error: "Custom alias already in use" });
    }
  }

  const shortCode = await getNextShortCode();
  const url = await Url.create({ shortCode, longUrl, customAlias, tags });

  res.status(201).json({
    shortCode: url.shortCode,
    shortUrl: `${req.protocol}://${req.get("host")}/${url.shortCode}`,
    longUrl: url.longUrl,
    createdAt: url.createdAt,
  });
}

module.exports = { createShortUrl };
