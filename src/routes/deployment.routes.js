const express = require("express");
const deploymentController = require("../controllers/deployment.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");
const uploadDeploymentLogo = require("../middleware/uploadDeploymentLogo");

const router = express.Router();

router.get("/", requireAuth, deploymentController.list);
router.get("/selected", requireAuth, deploymentController.getSelected);
router.post("/select", requireAuth, deploymentController.select);
router.post("/", requireAuth, requireAdmin, deploymentController.create);
router.patch("/:id", requireAuth, requireAdmin, deploymentController.update);
router.post("/:id/logo", requireAuth, requireAdmin, uploadDeploymentLogo, deploymentController.uploadLogo);
router.delete("/:id/logo", requireAuth, requireAdmin, deploymentController.removeLogo);

module.exports = router;
