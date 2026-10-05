const express = require("express");
const { createShortUrl } = require("../controllers/shorten.controller");

const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", requireAuth, createShortUrl);

module.exports = router;
