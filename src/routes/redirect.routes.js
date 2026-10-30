const express = require("express");
const { redirectShortUrl } = require("../controllers/redirect.controller");

/**
 * @openapi
 * /{code}:
 *   get:
 *     tags: [Redirect]
 *     summary: Redirect to the original URL (short code or custom alias)
 *     description: Served from Redis when cached (24h TTL). Records a click asynchronously; the redirect never waits on analytics.
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string, pattern: '^[a-zA-Z0-9-]{1,30}$' }
 *     responses:
 *       301:
 *         description: Redirect to the long URL
 *         headers:
 *           Location: { schema: { type: string, format: uri } }
 *       404:
 *         description: Unknown or malformed code
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       410:
 *         description: The link was deleted or has expired
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
const CODE_PATTERN = /^[a-zA-Z0-9-]{1,30}$/;

// Junk paths (favicon.ico, scanner probes) must not reach Redis or Mongo.
function validateCode(req, res, next) {
  if (!CODE_PATTERN.test(req.params.code)) {
    return res.status(404).json({ error: "Short URL not found" });
  }
  next();
}

const router = express.Router();

router.get("/:code", validateCode, redirectShortUrl);

module.exports = router;
