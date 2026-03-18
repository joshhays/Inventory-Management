const express = require("express");
const orderService = require("../services/order.service");
const deploymentService = require("../services/deployment.service");
const shippingService = require("../services/shipping.service");
const customerController = require("../controllers/customer.controller");
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
    const order = await orderService.create({
      deploymentId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      shippingAddress: shippingStr,
      shippingCost: shippingCost ?? 0,
      shippingMethod: shippingMethod || null,
      items,
    });

    // Auto-create shipping label when order has shipping address (and deployment has shipping enabled)
    const dep = await deploymentService.findById(deploymentId);
    if (shippingStr && order?.id && dep?.shippingEnabled !== false) {
      try {
        const itemCount = (order.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
        const result = await shippingService.createLabel(order, null, { deploymentId, itemCount });
        await orderService.updateLabelInfo(order.id, {
          shippingLabelUrl: result.labelUrl,
          trackingCode: result.trackingCode,
          easypostShipmentId: result.easypostShipmentId,
        }, deploymentId);
        // Refetch order so response includes label info
        const updated = await orderService.findById(order.id, deploymentId);
        return res.status(201).json(updated);
      } catch (err) {
        // Log but don't fail order creation; admin can create label manually
        console.warn("Auto-create label failed for order", order.id, err.message);
      }
    }

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

module.exports = router;
