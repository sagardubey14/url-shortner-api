const mongoose = require("mongoose");

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

// One document per click, in its own collection so click write volume never
// contends with URL reads. Keyed by shortCode (not urlId) because the redirect
// hot path has the code on a cache hit but not the URL's _id.
const analyticsSchema = new mongoose.Schema({
  shortCode: { type: String, required: true },
  timestamp: { type: Date, required: true },
  referrer: String,
  userAgent: String,
  ipAddress: String,
  country: String,
});

analyticsSchema.index({ shortCode: 1, timestamp: -1 });
analyticsSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: THIRTY_DAYS_SECONDS },
);

module.exports = mongoose.model("Analytics", analyticsSchema);
