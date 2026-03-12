const express = require("express");
const orderService = require("../services/order.service");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/orders", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const { customerPhone, shippingAddress, items } = req.body;
    const customerName = req.body.customerName || user.name || user.email.split("@")[0];
    const customerEmail = (req.body.customerEmail || user.email).toLowerCase().trim();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "items (non-empty array) is required.",
      });
    }

    const order = await orderService.create({
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      shippingAddress: shippingAddress || null,
      items,
    });

    return res.status(201).json(order);
  } catch (error) {
    if (error.message?.includes("Product not found")) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.get("/orders", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const { page, limit } = req.query;
    const [orders, total] = await orderService.findManyByEmail(user.email, { page, limit });
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
