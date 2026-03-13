const express = require("express");
const dashboardWidgetController = require("../controllers/dashboardWidget.controller");

const router = express.Router();

router.get("/", dashboardWidgetController.getWidgets);
router.get("/:id/data", dashboardWidgetController.getWidgetData);
router.post("/", dashboardWidgetController.createWidget);
router.put("/reorder", dashboardWidgetController.reorderWidgets);
router.patch("/:id", dashboardWidgetController.updateWidget);
router.delete("/:id", dashboardWidgetController.deleteWidget);

module.exports = router;
