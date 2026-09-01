const express = require("express");
const { redirectShortUrl } = require("../controllers/redirect.controller");

const router = express.Router();

router.get("/:code", redirectShortUrl);

module.exports = router;
