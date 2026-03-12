const orderService = require("../services/order.service");
const emailService = require("../services/email.service");

const createOrder = async (req, res, next) => {
  try {
    const { customerName, customerEmail, customerPhone, shippingAddress, items } = req.body;

    if (!customerName || !customerEmail || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "customerName, customerEmail, and items (non-empty array) are required.",
      });
    }

    const order = await orderService.create({
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
    });

    return res.status(201).json(order);
  } catch (error) {
    if (error.message?.includes("Product not found")) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const [orders, total] = await orderService.findMany({
      page,
      limit,
      status,
    });

    const limitNum = limit ? Math.min(100, Math.max(1, Number(limit) || 50)) : 50;
    const pageNum = page ? Math.max(1, Number(page) || 1) : 1;

    return res.status(200).json({
      orders,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    return next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await orderService.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    console.log("[order] PATCH status received: orderId=" + id + " status=" + JSON.stringify(status));
    if (!status || typeof status !== "string") {
      return res.status(400).json({ message: "status is required." });
    }
    const newStatus = status.trim().toLowerCase();
    const order = await orderService.updateStatus(id, status.trim());
    console.log("[order] Status updated to '" + newStatus + "' for order #" + order.id);

    // Send email when order becomes ready for messenger pickup
    if (newStatus === "ready") {
      if (emailService.isEmailConfigured()) {
        emailService.sendOrderReadyEmail(order).catch((err) => {
          console.error("[order] Email notification failed:", err.message);
        });
      } else {
        console.log("[order] Order #" + order.id + " marked ready – email skipped (not configured)");
      }
    }

    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const updateOrderItemPicked = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { picked } = req.body;
    const order = await orderService.updateItemPicked(id, itemId, picked);
    if (!order) {
      return res.status(404).json({ message: "Order or item not found." });
    }
    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateOrderItemPicked,
};
