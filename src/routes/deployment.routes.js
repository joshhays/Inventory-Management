const express = require("express");
const deploymentController = require("../controllers/deployment.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, deploymentController.list);
router.get("/selected", requireAuth, deploymentController.getSelected);
router.post("/select", requireAuth, deploymentController.select);
router.post("/", requireAuth, requireAdmin, deploymentController.create);

module.exports = router;
