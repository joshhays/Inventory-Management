const express = require("express");
const inventoryLogController = require("../controllers/inventoryLog.controller");

const router = express.Router();

router.get("/", inventoryLogController.getLogs);
router.get("/actions", inventoryLogController.getActions);

module.exports = router;
