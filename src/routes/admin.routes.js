const express = require("express");
const approvalService = require("../services/approval.service");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/pending-approvals
 * Returns all orders with status PENDING_APPROVAL.
 * Includes customer name and proof PDF URLs for each POD item.
 * Query: deploymentId (optional) - filter by deployment
 */
router.get("/pending-approvals", async (req, res, next) => {
  try {
    const deploymentId = req.deploymentId ?? req.query.deploymentId ?? req.session?.selectedDeploymentId;
    const orders = await approvalService.getPendingApprovals(deploymentId);
    return res.status(200).json({ orders });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/orders/:id/approve
 * Approve an order: update status to APPROVED and create EasyPost shipping label.
 */
router.post("/orders/:id/approve", async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const deploymentId = req.deploymentId ?? req.query.deploymentId ?? req.session?.selectedDeploymentId;
    const order = await approvalService.approveOrder(orderId, deploymentId);
    return res.status(200).json(order);
  } catch (err) {
    if (err.message?.includes("Order not found")) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message?.includes("cannot be approved") || err.message?.includes("no shipping address")) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message?.includes("Shipping is disabled") || err.message?.includes("EASYPOST")) {
      return res.status(503).json({ message: err.message });
    }
    next(err);
  }
});

module.exports = router;
