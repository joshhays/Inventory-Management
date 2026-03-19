const express = require("express");
const orderService = require("../services/order.service");
const deploymentService = require("../services/deployment.service");
const shippingService = require("../services/shipping.service");
const customerController = require("../controllers/customer.controller");
const mailService = require("../services/mail.service");
const approvalService = require("../services/approval.service");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

async function resolveDeploymentId(req, res, next) {
  const fromBody = req.body?.deploymentId ?? req.body?.deploymentSlug;
  const fromQuery = req.query?.deploymentId ?? req.query?.deployment;
  const val = fromBody ?? fromQuery;
  if (val == null) return next();
  if (Number(val)) {
    req.resolvedDeploymentId = Number(val);
    return next();
  }
  try {
    const dep = await deploymentService.findBySlug(String(val).trim());
    if (dep) req.resolvedDeploymentId = dep.id;
  } catch (_) {}
  next();
}

async function requireApprover(req, res, next) {
  const deploymentId = req.resolvedDeploymentId ?? req.query.deploymentId ?? req.query.deployment;
  let id = deploymentId;
  if (typeof id === "string") {
    try {
      const dep = await deploymentService.findBySlug(String(id).trim());
      id = dep?.id;
    } catch (_) {}
  }
  if (!id || !req.user?.id) {
    return res.status(400).json({ message: "Deployment required. Use ?deployment=slug" });
  }
  const canApprove = await approvalService.canUserApproveForDeployment(req.user.id, id);
  if (!canApprove) {
    return res.status(403).json({ message: "You do not have permission to approve orders for this store." });
  }
  req.resolvedDeploymentId = id;
  next();
}

router.get("/profile", customerController.getProfile);
router.patch("/profile", customerController.updateProfile);
router.get("/addresses", customerController.getAddresses);
router.post("/addresses", customerController.createAddress);
router.delete("/addresses/:id", customerController.deleteAddress);

router.post("/orders", requireAuth, resolveDeploymentId, async (req, res, next) => {
  try {
    const user = req.user;
    const { customerPhone, shippingAddress, shipping, shippingCost, shippingMethod, items } = req.body;
    const customerName = req.body.customerName || user.name || user.email.split("@")[0];
    const customerEmail = (req.body.customerEmail || user.email).toLowerCase().trim();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "items (non-empty array) is required.",
      });
    }

    let shippingStr = null;
    if (shipping && typeof shipping === "object") {
      const { name, company, address1, address2, city, state, zip } = shipping;
      if (name && address1 && city && state && zip) {
        shippingStr = JSON.stringify({
          name: String(name).trim(),
          company: company ? String(company).trim() : null,
          address1: String(address1).trim(),
          address2: address2 ? String(address2).trim() : null,
          city: String(city).trim(),
          state: String(state).trim(),
          zip: String(zip).trim(),
        });
      }
    }
    if (!shippingStr && shippingAddress && typeof shippingAddress === "string") {
      shippingStr = shippingAddress.trim() || null;
    }

    const deploymentId = req.resolvedDeploymentId ?? req.body.deploymentId ?? req.session?.selectedDeploymentId ?? 1;
    const hasPODItems = items.some((i) => i.printData != null && (typeof i.printData === "object" ? Object.keys(i.printData).length : String(i.printData).trim()));
    const status = hasPODItems ? "pending_approval" : undefined;

    const order = await orderService.create({
      deploymentId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      shippingAddress: shippingStr,
      shippingCost: shippingCost ?? 0,
      shippingMethod: shippingMethod || null,
      items,
      status,
    });

    // Send ORDER_PLACED email (template must exist)
    try {
      await mailService.triggerNotification(order.id, "ORDER_PLACED");
    } catch (mailErr) {
      console.warn("ORDER_PLACED email failed:", mailErr.message);
    }

    // Send ORDER_APPROVAL_NEEDED to approver groups when POD order needs approval
    if (hasPODItems) {
      try {
        await mailService.triggerNotification(order.id, "ORDER_APPROVAL_NEEDED");
      } catch (mailErr) {
        console.warn("ORDER_APPROVAL_NEEDED email failed:", mailErr.message);
      }
    }

    // Labels are created manually when an order is approved (POD) or via Orders page (regular orders)
    return res.status(201).json(order);
  } catch (error) {
    if (
      error.message?.includes("Product not found") ||
      error.message?.includes("Out of stock")
    ) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.get("/orders", requireAuth, resolveDeploymentId, async (req, res, next) => {
  try {
    const user = req.user;
    const { page, limit } = req.query;
    const deploymentId = req.resolvedDeploymentId ?? (req.query.deploymentId ? Number(req.query.deploymentId) : null);
    const [orders, total] = await orderService.findManyByEmail(user.email, { page, limit, deploymentId });
    const limitNum = limit ? Math.min(100, Math.max(1, Number(limit) || 20)) : 20;
    const pageNum = page ? Math.max(1, Number(page) || 1) : 1;

    return res.status(200).json({
      orders,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/orders/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await orderService.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (String(order.customerEmail).toLowerCase() !== String(req.user.email).toLowerCase()) {
      return res.status(403).json({ message: "You can only view your own orders." });
    }
    return res.status(200).json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customer/pending-approvals?deployment=slug
 * Customer-side approval queue. Requires user to be in an approver group for the deployment.
 */
router.get("/pending-approvals", requireAuth, resolveDeploymentId, requireApprover, async (req, res, next) => {
  try {
    const deploymentId = req.resolvedDeploymentId;
    const orders = await approvalService.getPendingApprovals(deploymentId);
    const dep = await deploymentService.findById(deploymentId);
    const baseUrl = process.env.APP_URL || process.env.BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || "";
    const storeBase = baseUrl ? (baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`) : "";
    const storeSlug = dep?.slug || "";
    const ordersWithStoreProofUrls = orders.map((o) => ({
      ...o,
      proofUrls: (o.proofUrls || []).map((p) => ({
        ...p,
        proofPdfUrl: `/api/customer/orders/${o.id}/items/${p.itemId}/print-pdf?deployment=${encodeURIComponent(storeSlug)}`,
      })),
    }));
    return res.status(200).json({ orders: ordersWithStoreProofUrls });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customer/orders/:id/approve?deployment=slug
 * Approve an order. Requires approver permission.
 */
router.post("/orders/:id/approve", requireAuth, resolveDeploymentId, requireApprover, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const deploymentId = req.resolvedDeploymentId;
    const order = await approvalService.approveOrder(orderId, deploymentId);
    return res.status(200).json(order);
  } catch (err) {
    if (err.message?.includes("Order not found")) return res.status(404).json({ message: err.message });
    if (err.message?.includes("cannot be approved") || err.message?.includes("no shipping address")) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message?.includes("Shipping is disabled")) return res.status(503).json({ message: err.message });
    next(err);
  }
});

/**
 * POST /api/customer/orders/:id/reject?deployment=slug
 * Reject an order. Requires approver permission.
 */
router.post("/orders/:id/reject", requireAuth, resolveDeploymentId, requireApprover, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const deploymentId = req.resolvedDeploymentId;
    const order = await approvalService.rejectOrder(orderId, deploymentId);
    return res.status(200).json(order);
  } catch (err) {
    if (err.message?.includes("Order not found")) return res.status(404).json({ message: err.message });
    if (err.message?.includes("already approved")) return res.status(400).json({ message: err.message });
    next(err);
  }
});

/**
 * GET /api/customer/orders/:id/items/:itemId/print-pdf?deployment=slug
 * Get print PDF for an order item. Requires approver permission.
 */
router.get("/orders/:id/items/:itemId/print-pdf", requireAuth, resolveDeploymentId, requireApprover, async (req, res, next) => {
  try {
    const { id: orderId, itemId } = req.params;
    const deploymentId = req.resolvedDeploymentId;
    const order = await orderService.findById(orderId, deploymentId);
    if (!order) return res.status(404).json({ message: "Order not found." });
    const item = order.items?.find((i) => String(i.id) === String(itemId));
    if (!item) return res.status(404).json({ message: "Order item not found." });
    const orderController = require("../controllers/order.controller");
    return orderController.getOrderItemPrintPdf(req, res, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
