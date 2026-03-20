const express = require("express");
const deploymentService = require("../services/deployment.service");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

/** Default access categories (Pageflex-style) */
const DEFAULT_ACCESS_CATEGORIES = [
  { category: "Order Management", pages: ["Orders", "Approval Queue", "Prep Queue", "Production Queue", "Shipping Queue"] },
  { category: "Downloads", pages: ["Downloads"] },
  { category: "Finance", pages: ["Finance", "Ledger"] },
  { category: "Logs", pages: ["Logs"] },
  { category: "User Accounts Management", pages: ["User Accounts", "User Groups", "User Access", "Profile Fields", "Approvals", "Address Books"] },
  { category: "Content Production", pages: ["Projects", "Categories", "Products", "Asset Manager", "Global Library", "Metadata Fields"] },
  { category: "Purchasing", pages: ["Checkout", "Price Tables", "Tax Rates"] },
  { category: "Admin Accounts Management", pages: ["Admin Accounts", "Admin Groups", "Admin Access"] },
  { category: "Notifications", pages: ["Notifications", "Themes", "Site Options"] },
];

/**
 * GET /api/admin-access
 * Get admin access config for current deployment.
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
      } catch (_) {}
    }
    if (!Array.isArray(config) || config.length === 0) {
      const adminGroupService = require("../services/adminGroup.service");
      const groups = await adminGroupService.findAll(deploymentId);
      const orderAccess = groups.find((g) => /order/i.test(g.name));
      const firstGroup = groups[0];
      const sampleId = (orderAccess || firstGroup)?.id;
      config = DEFAULT_ACCESS_CATEGORIES.map((c) => ({
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
