const { enqueueMetadata } = require("../config/queue");

// Fire-and-forget: shortening must never wait on, or fail because of, metadata.
function scheduleMetadataFetch(req, { shortCode, longUrl }) {
  try {
    Promise.resolve(enqueueMetadata({ shortCode, longUrl })).catch((err) =>
      req.log?.warn({ err }, "Failed to enqueue metadata fetch"),
    );
  } catch (err) {
    req.log?.warn({ err }, "Failed to enqueue metadata fetch");
  }
}

module.exports = { scheduleMetadataFetch };
