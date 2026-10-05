const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const { listLinks, deleteLink } = require("../controllers/links.controller");

const router = express.Router();

router.use(requireAuth);
router.get("/", listLinks);
router.delete("/:code", deleteLink);

module.exports = router;
