/**
 * Approval workflow service for orders with print-on-demand items.
 * When an order has POD items, it starts as PENDING_APPROVAL.
 * Manager approves → status becomes APPROVED → EasyPost creates shipping label → ORDER_APPROVED email.
 */

const prisma = require("../lib/prisma");
const shippingService = require("./shipping.service");
const orderService = require("./order.service");
const mailService = require("./mail.service");

const STATUS_PENDING_APPROVAL = "pending_approval";
const STATUS_APPROVED = "approved";

/**
 * Approve an order: update status to APPROVED, create EasyPost label, trigger ORDER_APPROVED email.
 * @param {number} orderId - Order ID
 * @param {number} [deploymentId] - Optional deployment filter
 * @returns {Promise<Object>} Updated order with label info and trackingCode
 */
async function approveOrder(orderId, deploymentId = null) {
  const order = await orderService.findById(orderId, deploymentId);
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.status !== STATUS_PENDING_APPROVAL && order.approvalStatus !== "PENDING") {
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

  await orderService.updateLabelInfo(orderId, {
    shippingLabelUrl: result.labelUrl,
    trackingCode: result.trackingCode,
    easypostShipmentId: result.easypostShipmentId,
  }, deploymentId);

  await orderService.updateStatus(orderId, STATUS_APPROVED, deploymentId);

  await prisma.order.update({
    where: { id: Number(orderId) },
    data: { approvalStatus: "APPROVED" },
  });

  try {
    await mailService.triggerNotification(orderId, "ORDER_APPROVED");
  } catch (mailErr) {
    console.error("ORDER_APPROVED email failed:", mailErr.message);
  }

  const updated = await orderService.findById(orderId, deploymentId);
  return { ...updated, trackingCode: result.trackingCode };
}

/**
 * Reject an order: set approvalStatus to REJECTED and status to rejected.
 * @param {number} orderId - Order ID
 * @param {number} [deploymentId] - Optional deployment filter
 * @returns {Promise<Object>} Updated order
 */
async function rejectOrder(orderId, deploymentId = null) {
  const order = await orderService.findById(orderId, deploymentId);
  if (!order) throw new Error("Order not found");
  if (order.status === STATUS_APPROVED) {
    throw new Error("Order is already approved");
  }

  await orderService.updateStatus(orderId, "rejected", deploymentId);
  await prisma.order.update({
    where: { id: Number(orderId) },
    data: { approvalStatus: "REJECTED" },
  });

  try {
    await mailService.triggerNotification(orderId, "ORDER_REJECTED");
  } catch (mailErr) {
    console.error("ORDER_REJECTED email failed:", mailErr.message);
  }

  return orderService.findById(orderId, deploymentId);
}

/**
 * Check if a user can approve orders for a deployment.
 * User must be in a group that is configured as recipient for ORDER_APPROVAL_NEEDED template.
 * Also allows backend admins (isAdmin).
 * @param {number} userId - User ID
 * @param {number} deploymentId - Deployment ID
 * @returns {Promise<boolean>}
 */
async function canUserApproveForDeployment(userId, deploymentId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    include: { groups: { include: { group: true } } },
  });
  if (!user) return false;
  if (user.isAdmin) return true;

  const template = await prisma.notificationTemplate.findUnique({
    where: { name: "ORDER_APPROVAL_NEEDED" },
    include: { recipientGroups: { include: { group: true } } },
  });
  if (!template?.recipientGroups?.length) return false;

  const approverGroupIds = template.recipientGroups
    .filter((r) => r.group?.deploymentId === Number(deploymentId))
    .map((r) => r.groupId);
  if (approverGroupIds.length === 0) return false;

  const userGroupIds = (user.groups || []).map((m) => m.groupId);
  return approverGroupIds.some((gid) => userGroupIds.includes(gid));
}

/**
 * Get all orders with status PENDING_APPROVAL or approvalStatus PENDING.
 * @param {number} [deploymentId] - Optional deployment filter
 * @returns {Promise<Array>} Orders with customer name and proof PDF URLs
 */
async function getPendingApprovals(deploymentId = null) {
  const where = {
    OR: [
      { status: STATUS_PENDING_APPROVAL },
      { approvalStatus: "PENDING" },
    ],
  };
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
  rejectOrder,
  getPendingApprovals,
  canUserApproveForDeployment,
  STATUS_PENDING_APPROVAL,
  STATUS_APPROVED,
};
