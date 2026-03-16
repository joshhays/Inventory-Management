const express = require("express");
const orderController = require("../controllers/order.controller");

const router = express.Router();

router.post("/", orderController.createOrder);
router.get("/", orderController.getOrders);
router.get("/:id", orderController.getOrder);
router.patch("/:id/status", orderController.updateOrderStatus);
router.patch("/:id/items/:itemId/pick", orderController.updateOrderItemPicked);
router.get("/:id/items/:itemId/print-pdf", orderController.getOrderItemPrintPdf);

module.exports = router;
