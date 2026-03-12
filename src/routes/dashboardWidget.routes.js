const express = require("express");
const dashboardWidgetController = require("../controllers/dashboardWidget.controller");

const router = express.Router();

router.get("/", dashboardWidgetController.getWidgets);
router.post("/", dashboardWidgetController.createWidget);
router.delete("/:id", dashboardWidgetController.deleteWidget);

module.exports = router;
