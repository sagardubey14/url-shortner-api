const express = require("express");
const { register, login } = require("../controllers/auth.controller");

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create a user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Credentials' }
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 email: { type: string, format: email }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange credentials for a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Credentials' }
 *     responses:
 *       200:
 *         description: Token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/register", register);
router.post("/login", login);

module.exports = router;
