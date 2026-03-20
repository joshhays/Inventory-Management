const express = require("express");
const deploymentService = require("../services/deployment.service");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");
const { BENTO_ITEMS, getDefaultAccessConfig } = require("../lib/bentoConfig");

const router = express.Router();

/**
 * GET /api/admin-access
 * Get admin access config for current deployment (bento-based).
 */
router.get("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const deploymentId = req.deploymentId ?? req.session?.selectedDeploymentId ?? 1;
    const dep = await deploymentService.findById(deploymentId);
    if (!dep) return res.status(404).json({ message: "Deployment not found." });
    let config = [];
    if (dep.adminAccessConfig) {
      try {
        config = JSON.parse(dep.adminAccessConfig);
        config = config.map((row) => {
          if (row.bentoId) return row;
          const match = BENTO_ITEMS.find((b) => b.title === row.category || b.id === row.category);
          return { ...row, bentoId: match?.id || row.category };
        });
      } catch (_) {}
    }
    if (!Array.isArray(config) || config.length === 0) {
      const adminGroupService = require("../services/adminGroup.service");
      const groups = await adminGroupService.findAll(deploymentId);
      const sampleId = groups[0]?.id;
      config = getDefaultAccessConfig().map((c) => ({
        ...c,
        viewModifyGroupIds: sampleId ? [sampleId] : [],
        viewOnlyGroupIds: sampleId ? [sampleId] : [],
      }));
    }
    return res.status(200).json({ config, deploymentId });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin-access
 * Update admin access config for current deployment.
 */
router.patch("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const deploymentId = req.deploymentId ?? req.session?.selectedDeploymentId ?? 1;
    const { config } = req.body;
    if (!Array.isArray(config)) {
      return res.status(400).json({ message: "config must be an array." });
    }
    await deploymentService.update(deploymentId, { adminAccessConfig: config });
    return res.status(200).json({ config });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
