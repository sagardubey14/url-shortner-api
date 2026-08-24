const express = require("express");
const { createShortUrl } = require("../controllers/shorten.controller");

const router = express.Router();

router.post("/", createShortUrl);

module.exports = router;
