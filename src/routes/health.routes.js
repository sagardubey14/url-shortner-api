const express = require("express");
const { getHealth } = require("../controllers/health.controller");

const router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Check primary, secondary and Redis independently
 *     description: Used by the load balancer for circuit breaking. Returns 503 if any dependency is unhealthy.
 *     responses:
 *       200:
 *         description: All dependencies healthy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/HealthStatus' }
 *       503:
 *         description: At least one dependency is unhealthy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/HealthStatus' }
 */
router.get("/", getHealth);

module.exports = router;
