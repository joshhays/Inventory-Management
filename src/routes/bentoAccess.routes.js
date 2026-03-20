/**
 * GET /api/bento-access
 * Returns per-bento access for the current user: hidden | view | modify
 * Used by the dashboard to show/hide bento cards and indicate view vs modify.
 */
const express = require("express");
const deploymentService = require("../services/deployment.service");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth.middleware");
const { BENTO_ITEMS } = require("../lib/bentoConfig");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const deploymentId = req.deploymentId ?? req.session?.selectedDeploymentId ?? 1;

    const bentoAccess = {};
    for (const item of BENTO_ITEMS) {
      bentoAccess[item.id] = "hidden";
    }

    if (!user) {
      return res.status(200).json({ bentoAccess, items: BENTO_ITEMS });
    }

    if (user.isAdmin) {
      for (const item of BENTO_ITEMS) {
        bentoAccess[item.id] = "modify";
      }
      return res.status(200).json({ bentoAccess, items: BENTO_ITEMS });
    }

    const dep = await deploymentService.findById(deploymentId);
    if (!dep) {
      return res.status(200).json({ bentoAccess, items: BENTO_ITEMS });
    }

    const memberships = await prisma.adminGroupMember.findMany({
      where: { userId: user.id },
      include: { adminGroup: true },
    });
    const userAdminGroupIds = memberships
      .filter((m) => m.adminGroup?.deploymentId === deploymentId)
      .map((m) => m.adminGroupId)
      .filter(Boolean);
    if (userAdminGroupIds.length === 0) {
      return res.status(200).json({ bentoAccess, items: BENTO_ITEMS });
    }

    let config = [];
    if (dep.adminAccessConfig) {
      try {
        config = JSON.parse(dep.adminAccessConfig);
      } catch (_) {}
    }

    for (const row of config) {
      const bentoId = row.bentoId || BENTO_ITEMS.find((b) => b.title === row.category)?.id || row.category;
      const modifyIds = row.viewModifyGroupIds || [];
      const viewIds = row.viewOnlyGroupIds || [];

      if (modifyIds.some((gid) => userAdminGroupIds.includes(gid))) {
        bentoAccess[bentoId] = "modify";
      } else if (viewIds.some((gid) => userAdminGroupIds.includes(gid))) {
        bentoAccess[bentoId] = bentoAccess[bentoId] === "modify" ? "modify" : "view";
      }
    }

    return res.status(200).json({ bentoAccess, items: BENTO_ITEMS });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

