const Url = require("../models/url.model");
const User = require("../models/user.model");
const { scheduleMetadataFetch } = require("../services/metadata.service");
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
    // An alias must not collide with another link's alias or short code,
    // since GET /:code resolves both.
    const existing = await Url.findOne({
      $or: [{ customAlias }, { shortCode: customAlias }],
    });
    if (existing) {
      return res.status(409).json({ error: "Custom alias already in use" });
    }
  }

  const shortCode = await getNextShortCode();
  let url;
  try {
    url = await Url.create({
      shortCode,
      longUrl,
      customAlias,
      tags,
      userId: req.userId,
    });
  } catch (err) {
    // Lost a race for the same alias between the check above and the insert.
    if (err.code === 11000) {
      return res.status(409).json({ error: "Custom alias already in use" });
    }
    throw err;
  }

  try {
    await User.updateOne({ _id: req.userId }, { $inc: { totalLinks: 1 } });
  } catch (err) {
    // totalLinks is a denormalized convenience; don't fail a created link.
    req.log?.warn({ err }, "Failed to increment totalLinks");
  }

  scheduleMetadataFetch(req, {
    shortCode: url.shortCode,
    longUrl: url.longUrl,
  });

  res.status(201).json({
    shortCode: url.shortCode,
    shortUrl: `${req.protocol}://${req.get("host")}/${url.shortCode}`,
    longUrl: url.longUrl,
    createdAt: url.createdAt,
  });
}

module.exports = { createShortUrl };
