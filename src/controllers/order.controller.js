const path = require("path");
const fs = require("fs");
const orderService = require("../services/order.service");
const shippingService = require("../services/shipping.service");
const { generateBusinessCardPdf } = require("../services/podPdf.service");
const { businessCardTemplate } = require("../podTemplates");

const createOrder = async (req, res, next) => {
  try {
    const { customerName, customerEmail, customerPhone, shippingAddress, items } = req.body;

    if (!customerName || !customerEmail || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "customerName, customerEmail, and items (non-empty array) are required.",
      });
    }

    const order = await orderService.create({
      deploymentId: req.deploymentId,
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
      deploymentId: req.deploymentId,
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
    const order = await orderService.findById(id, req.deploymentId);
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
    if (!status || typeof status !== "string") {
      return res.status(400).json({ message: "status is required." });
    }
    const order = await orderService.updateStatus(id, status.trim(), req.deploymentId);

    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const updateOrderItemPicked = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { picked } = req.body;
    const order = await orderService.updateItemPicked(id, itemId, picked, req.deploymentId);
    if (!order) {
      return res.status(404).json({ message: "Order or item not found." });
    }
    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const updateOrderItemQuantity = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { quantity } = req.body;
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ message: "quantity is required." });
    }
    const order = await orderService.updateItemQuantity(id, itemId, quantity, req.deploymentId);
    if (!order) {
      return res.status(404).json({ message: "Order or item not found." });
    }
    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const getOrderItemPrintPdf = async (req, res, next) => {
  try {
    const { id: orderId, itemId } = req.params;
    const order = await orderService.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    const item = order.items.find((i) => String(i.id) === String(itemId));
    if (!item) {
      return res.status(404).json({ message: "Order item not found." });
    }
    let userData = {};
    if (item.printData && typeof item.printData === "string" && item.printData.trim()) {
      try {
        userData = JSON.parse(item.printData);
      } catch (_) {
        return res.status(400).json({ message: "Invalid print data for this item." });
      }
    }
    if (Object.keys(userData).length === 0) {
      return res.status(400).json({ message: "No print data for this item." });
    }

    const basePdfPath = path.join(__dirname, "../../product-files/business-card-base.pdf");
    if (!fs.existsSync(basePdfPath)) {
      return res.status(503).json({ message: "Print template not available." });
    }
    const basePdfBytes = fs.readFileSync(basePdfPath);
    const pdfBuffer = await generateBusinessCardPdf(basePdfBytes, userData, businessCardTemplate);

    const filename = `order-${orderId}-item-${item.id}-print.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    return next(error);
  }
};

const createLabel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { parcel } = req.body;
    const order = await orderService.findById(id, req.deploymentId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (!order.shippingAddress) {
      return res.status(400).json({ message: "Order has no shipping address." });
    }
    const itemCount = (order.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
    const opts = { deploymentId: order.deploymentId, itemCount };
    const result = await shippingService.createLabel(order, parcel || null, opts);
    const updated = await orderService.updateLabelInfo(
      id,
      {
        shippingLabelUrl: result.labelUrl,
        trackingCode: result.trackingCode,
        easypostShipmentId: result.easypostShipmentId,
      },
      req.deploymentId
    );
    return res.status(200).json(updated);
  } catch (error) {
    if (error.message?.includes("EASYPOST_API_KEY")) {
      return res.status(503).json({ message: "Shipping labels are not configured." });
    }
    return next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateOrderItemPicked,
  updateOrderItemQuantity,
  getOrderItemPrintPdf,
  createLabel,
};
