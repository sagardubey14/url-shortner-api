const { enqueueClick } = require("../config/queue");

// Fire-and-forget: the redirect must never wait on, or fail because of, analytics.
function recordClick(req, shortCode) {
  try {
    Promise.resolve(
      enqueueClick({
        shortCode,
        ipAddress: req.ip,
        referrer: req.get("referer"),
        userAgent: req.get("user-agent"),
        timestamp: new Date().toISOString(),
      }),
    ).catch((err) => req.log?.warn({ err }, "Failed to enqueue click"));
  } catch (err) {
    req.log?.warn({ err }, "Failed to enqueue click");
  }
}

module.exports = { recordClick };
