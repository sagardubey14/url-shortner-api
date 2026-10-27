const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const { listLinks, deleteLink } = require("../controllers/links.controller");

/**
 * @openapi
 * /api/links:
 *   get:
 *     tags: [Links]
 *     summary: List your active links, newest first
 *     description: Read from a secondary, so results may lag writes by about 50-100ms.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: A page of links
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 links:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Link' }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 * /api/links/{code}:
 *   delete:
 *     tags: [Links]
 *     summary: Soft-delete one of your links
 *     description: The link stops redirecting (410) and is evicted from the cache. The document is kept.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Not found, or owned by someone else
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
const router = express.Router();

router.use(requireAuth);
router.get("/", listLinks);
router.delete("/:code", deleteLink);

module.exports = router;
