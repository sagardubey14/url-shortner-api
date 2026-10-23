const Analytics = require("../models/analytics.model");
const Url = require("../models/url.model");
const { countryForIp } = require("../utils/geoip");

async function flushClicks(clicks) {
  const docs = clicks.map((c) => ({
    shortCode: c.shortCode,
    ipAddress: c.ipAddress,
    referrer: c.referrer,
    userAgent: c.userAgent,
    country: countryForIp(c.ipAddress),
    timestamp: new Date(c.timestamp),
  }));
  await Analytics.insertMany(docs, { ordered: false });

  const perCode = new Map();
  for (const { shortCode } of clicks) {
    perCode.set(shortCode, (perCode.get(shortCode) || 0) + 1);
  }
  await Url.bulkWrite(
    [...perCode].map(([shortCode, count]) => ({
      updateOne: {
        filter: { shortCode },
        update: { $inc: { clickCount: count } },
      },
    })),
  );
}

module.exports = { flushClicks };
