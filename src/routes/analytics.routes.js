const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const { getAnalytics } = require("../controllers/analytics.controller");

/**
 * @openapi
 * /api/analytics/{code}:
 *   get:
 *     tags: [Analytics]
 *     summary: Click analytics for one of your links
 *     description: Read from a secondary. Clicks are batched by a worker, so recent clicks may take several seconds to appear. Data is kept for 30 days.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 1, maximum: 30, default: 30 }
 *     responses:
 *       200:
 *         description: Aggregated clicks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shortCode: { type: string }
 *                 days: { type: integer }
 *                 totalClicks: { type: integer }
 *                 byCountry:
 *                   type: array
 *                   description: Top 10; unresolved IPs are reported as "unknown"
 *                   items:
 *                     type: object
 *                     properties:
 *                       country: { type: string, example: US }
 *                       clicks: { type: integer }
 *                 byReferrer:
 *                   type: array
 *                   description: Top 10; missing referrers are reported as "direct"
 *                   items:
 *                     type: object
 *                     properties:
 *                       referrer: { type: string }
 *                       clicks: { type: integer }
 *                 byDate:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date: { type: string, format: date, example: '2026-10-19' }
 *                       clicks: { type: integer }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Not found, or owned by someone else
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
const router = express.Router();

router.get("/:code", requireAuth, getAnalytics);

module.exports = router;
