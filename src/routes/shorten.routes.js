const express = require("express");
const { createShortUrl } = require("../controllers/shorten.controller");

const { requireAuth } = require("../middlewares/auth.middleware");

const { shortenLimiter } = require("../middlewares/rate-limit.middleware");

const router = express.Router();

router.post("/", requireAuth, shortenLimiter, createShortUrl);

module.exports = router;
