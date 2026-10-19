const express = require("express");
const { redirectShortUrl } = require("../controllers/redirect.controller");

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
