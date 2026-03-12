const express = require("express");
const reportController = require("../controllers/report.controller");

const router = express.Router();

router.get("/config", reportController.getConfig);
router.get("/run", reportController.runReport);
router.post("/chat", reportController.chat);

module.exports = router;
