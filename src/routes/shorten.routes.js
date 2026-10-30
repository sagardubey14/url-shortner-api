const express = require("express");
const { createShortUrl } = require("../controllers/shorten.controller");

const { requireAuth } = require("../middlewares/auth.middleware");

const { shortenLimiter } = require("../middlewares/rate-limit.middleware");

const router = express.Router();

/**
 * @openapi
 * /api/shorten:
 *   post:
 *     tags: [Links]
 *     summary: Create a short URL
 *     description: Rate limited to 10 requests per minute per IP. OpenGraph metadata is fetched asynchronously after the response.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [longUrl]
 *             properties:
 *               longUrl: { type: string, format: uri, maxLength: 2048, description: http or https only }
 *               customAlias: { type: string, minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9-]+$', description: 'Also resolves at /{alias}. Must not collide with another link or be reserved (health, api, api-docs).' }
 *               tags:
 *                 type: array
 *                 maxItems: 5
 *                 items: { type: string, minLength: 1, maxLength: 50 }
 *     responses:
 *       201:
 *         description: Short URL created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shortCode: { type: string }
 *                 shortUrl: { type: string, format: uri }
 *                 longUrl: { type: string, format: uri }
 *                 createdAt: { type: string, format: date-time }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       409:
 *         description: Custom alias already in use
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/", requireAuth, shortenLimiter, createShortUrl);

module.exports = router;
