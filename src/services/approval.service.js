/**
 * Approval workflow service for orders with print-on-demand items.
 * When an order has POD items, it starts as PENDING_APPROVAL.
 * Manager approves → status becomes APPROVED → EasyPost creates shipping label.
 */

const prisma = require("../lib/prisma");
const shippingService = require("./shipping.service");
const orderService = require("./order.service");

const STATUS_PENDING_APPROVAL = "pending_approval";
const STATUS_APPROVED = "approved";

/**
 * Approve an order: update status to APPROVED and create shipping label via EasyPost.
 * @param {number} orderId - Order ID
 * @param {number} [deploymentId] - Optional deployment filter
 * @returns {Promise<Object>} Updated order with label info
 */
async function approveOrder(orderId, deploymentId = null) {
  const order = await orderService.findById(orderId, deploymentId);
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.status !== STATUS_PENDING_APPROVAL) {
    throw new Error(`Order cannot be approved: status is "${order.status}"`);
  }
  if (!order.shippingAddress) {
    throw new Error("Order has no shipping address");
  }

  const deploymentService = require("./deployment.service");
  const dep = await deploymentService.findById(order.deploymentId);
  if (dep && dep.shippingEnabled === false) {
    throw new Error("Shipping is disabled for this deployment");
  }

  const itemCount = (order.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
  const opts = { deploymentId: order.deploymentId, itemCount };

  const result = await shippingService.createLabel(order, null, opts);

  const updated = await orderService.updateLabelInfo(orderId, {
    shippingLabelUrl: result.labelUrl,
    trackingCode: result.trackingCode,
    easypostShipmentId: result.easypostShipmentId,
  }, deploymentId);

  await orderService.updateStatus(orderId, STATUS_APPROVED, deploymentId);

  return orderService.findById(orderId, deploymentId);
}

/**
 * Get all orders with status PENDING_APPROVAL.
 * @param {number} [deploymentId] - Optional deployment filter
 * @returns {Promise<Array>} Orders with customer name and proof PDF URLs
 */
async function getPendingApprovals(deploymentId = null) {
  const where = { status: STATUS_PENDING_APPROVAL };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => {
    const podItems = (order.items || []).filter(
      (i) => i.printData && typeof i.printData === "string" && i.printData.trim()
    );
    const proofUrls = podItems.map((item) => ({
      itemId: item.id,
      productName: item.productName,
      proofPdfUrl: `/api/orders/${order.id}/items/${item.id}/print-pdf`,
    }));

    return {
      id: order.id,
      deploymentId: order.deploymentId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items,
      proofUrls,
    };
  });
}

module.exports = {
  approveOrder,
  getPendingApprovals,
  STATUS_PENDING_APPROVAL,
  STATUS_APPROVED,
};
