const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const { getAnalytics } = require("../controllers/analytics.controller");

const router = express.Router();

router.get("/:code", requireAuth, getAnalytics);

module.exports = router;
