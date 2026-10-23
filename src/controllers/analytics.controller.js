const Url = require("../models/url.model");
const Analytics = require("../models/analytics.model");
const { analyticsQuerySchema } = require("../validators/analytics.validator");

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_N = 10;

const groupedClicks = (key, limit) => [
  { $group: { _id: key, clicks: { $sum: 1 } } },
  { $sort: limit ? { clicks: -1, _id: 1 } : { _id: 1 } },
  ...(limit ? [{ $limit: limit }] : []),
];

async function getAnalytics(req, res) {
  const parsed = analyticsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const { days } = parsed.data;
  const { code } = req.params;

  const url = await Url.findOne({ shortCode: code, userId: req.userId })
    .read("secondary")
    .lean();
  if (!url) {
    return res.status(404).json({ error: "Short URL not found" });
  }

  const since = new Date(Date.now() - days * DAY_MS);
  const [result] = await Analytics.aggregate([
    { $match: { shortCode: code, timestamp: { $gte: since } } },
    {
      $facet: {
        total: [{ $count: "n" }],
        byCountry: groupedClicks({ $ifNull: ["$country", "unknown"] }, TOP_N),
        byReferrer: groupedClicks({ $ifNull: ["$referrer", "direct"] }, TOP_N),
        byDate: groupedClicks({
          $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
        }),
      },
    },
  ]).read("secondary");

  res.json({
    shortCode: code,
    days,
    totalClicks: result.total[0]?.n ?? 0,
    byCountry: result.byCountry.map((r) => ({
      country: r._id,
      clicks: r.clicks,
    })),
    byReferrer: result.byReferrer.map((r) => ({
      referrer: r._id,
      clicks: r.clicks,
    })),
    byDate: result.byDate.map((r) => ({ date: r._id, clicks: r.clicks })),
  });
}

module.exports = { getAnalytics };
