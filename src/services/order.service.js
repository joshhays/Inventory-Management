const prisma = require("../lib/prisma");

function isPodLineItem(item) {
  return item?.printData != null && String(item.printData).trim() !== "";
}

function isRushFeeLine(item) {
  return (
    String(item?.sku || "").includes("-RUSH") ||
    String(item?.productName || "").startsWith("Rush processing:")
  );
}

/**
 * Adjust inventory for POD / business-card lines (deltaSign -1 = ship deduct, +1 = cancel restore).
 */
async function applyPodInventoryDelta(tx, order, deltaSign) {
  for (const item of order.items || []) {
    if (!isPodLineItem(item) || isRushFeeLine(item)) continue;
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product || product.productType === "kit") continue;
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const qtyBefore = product.quantity;
    const delta = qty * deltaSign;
    const newQty = Math.max(0, qtyBefore + delta);
    await tx.product.update({
      where: { id: product.id },
      data: { quantity: newQty },
    });
    const action = deltaSign < 0 ? "deduct" : "add";
    const source =
      deltaSign < 0 ? `order_ship:${order.id}` : `order_cancel:${order.id}`;
    await tx.inventoryLog.create({
      data: {
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        action,
        quantityBefore: qtyBefore,
        quantityAfter: newQty,
        source,
      },
    });
  }
}

function create({ deploymentId, customerName, customerEmail, customerPhone, shippingAddress, shippingCost, shippingMethod, billingSelection, discountAmount: passedDiscountAmount, items, status: initialStatus }) {
  if (!deploymentId) throw new Error("Deployment is required.");
  const depId = Number(deploymentId);
  return prisma.$transaction(async (tx) => {
    let total = 0;
    const orderItems = [];
    const outOfStock = [];

    // Group POD items by productId and sum total cards for smart pricing (e.g. 500×1 + 100×1 = 600 total)
    const podTotalsByProduct = new Map();
    items.forEach((item, idx) => {
      const hasPrintData = item.printData != null && (typeof item.printData === "object" ? Object.keys(item.printData).length : String(item.printData || "").trim());
      if (hasPrintData && item.productId) {
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const pid = item.productId;
        podTotalsByProduct.set(pid, (podTotalsByProduct.get(pid) || 0) + qty);
      }
    });

    function findBestPriceForTotalCards(matrix, totalCards) {
      if (!matrix || typeof matrix !== "object" || totalCards <= 0) return null;
      const tiers = [];
      for (const qtyStr of Object.keys(matrix)) {
        const row = matrix[qtyStr];
        if (!row || typeof row !== "object") continue;
        const qty = parseInt(qtyStr, 10);
        if (isNaN(qty) || qty <= 0) continue;
        for (const numStr of Object.keys(row)) {
          const total = row[numStr];
          if (total == null || typeof total !== "number") continue;
          const num = parseInt(numStr, 10);
          if (isNaN(num) || num <= 0) continue;
          const tierCards = qty * num;
          const unit = total / tierCards;
          tiers.push({ tierCards, unit });
        }
      }
      const exact = tiers.filter((t) => t.tierCards === totalCards);
      if (exact.length) return Math.min(...exact.map((t) => t.unit));
      const roundDown = tiers.filter((t) => t.tierCards <= totalCards);
      if (!roundDown.length) return null;
      const closest = Math.max(...roundDown.map((t) => t.tierCards));
      const matches = tiers.filter((t) => t.tierCards === closest);
      return Math.min(...matches.map((t) => t.unit));
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const product = item.productId
        ? await tx.product.findFirst({
            where: { id: Number(item.productId), deploymentId: depId },
            include: { kitItems: { include: { product: true } } },
          })
        : await tx.product.findFirst({
            where: { deploymentId: depId, sku: String(item.sku) },
            include: { kitItems: { include: { product: true } } },
          });

      if (!product) {
        throw new Error(`Product not found: ${item.productId || item.sku}`);
      }

      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      let allowedQuantities = null;
      try {
        const raw = product.allowedQuantities;
        if (raw && typeof raw === "string" && raw.startsWith("[")) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length) allowedQuantities = arr;
        }
      } catch (_) {}
      if (allowedQuantities && allowedQuantities.length && !allowedQuantities.includes(quantity)) {
        throw new Error(`${product.name} can only be ordered in quantities of: ${allowedQuantities.join(", ")}`);
      }
      const minOrderQty = product.minOrderQty != null ? Number(product.minOrderQty) : null;
      const maxOrderQty = product.maxOrderQty != null ? Number(product.maxOrderQty) : null;
      if (minOrderQty != null && quantity < minOrderQty) {
        throw new Error(`${product.name} requires a minimum order quantity of ${minOrderQty}`);
      }
      if (maxOrderQty != null && quantity > maxOrderQty) {
        throw new Error(`${product.name} has a maximum order quantity of ${maxOrderQty}`);
      }
      let available = 0;
      if (product.productType === "kit" && product.kitItems?.length) {
        let minAvailable = Infinity;
        for (const ki of product.kitItems) {
          const childQty = ki.product?.quantity ?? 0;
          const qtyPerKit = Math.max(1, ki.quantity);
          const avail = Math.floor(childQty / qtyPerKit);
          minAvailable = Math.min(minAvailable, avail);
        }
        available = minAvailable === Infinity ? 0 : minAvailable;
      } else {
        available = product.quantity ?? 0;
      }

      if (quantity > available) {
        outOfStock.push(`${product.name} (need ${quantity}, only ${available} in stock)`);
      }

      let unitPrice = product.price;
      const hasPrintData = item.printData != null && (typeof item.printData === "object" ? Object.keys(item.printData).length : String(item.printData || "").trim());
      if (hasPrintData && product.pricingMatrix) {
        try {
          const totalCards = podTotalsByProduct.get(product.id) || quantity;
          const matrix = typeof product.pricingMatrix === "string" ? JSON.parse(product.pricingMatrix) : product.pricingMatrix;
          const smartPrice = findBestPriceForTotalCards(matrix, totalCards);
          unitPrice = smartPrice != null ? smartPrice : product.price;
        } catch (_) {}
      }
      const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

      const printDataStr =
        item.printData != null && typeof item.printData === "object"
          ? JSON.stringify(item.printData)
          : typeof item.printData === "string" && item.printData.trim()
            ? item.printData.trim()
            : null;

      orderItems.push({
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        quantity,
        unitPrice,
        lineTotal,
        picked: false,
        printData: printDataStr,
      });
      total += lineTotal;
    }

    let isRushOrder = false;
    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      if (!raw || !raw.rush) continue;
      const line = orderItems[i];
      if (!line) continue;
      const rushProduct = await tx.product.findFirst({
        where: { id: line.productId, deploymentId: depId },
      });
      const fee = rushProduct?.rushFee != null ? Number(rushProduct.rushFee) : 0;
      if (!fee || fee <= 0 || Number.isNaN(fee)) continue;
      isRushOrder = true;
      const feeRounded = Math.round(fee * 100) / 100;
      orderItems.push({
        productId: rushProduct.id,
        sku: `${rushProduct.sku}-RUSH`,
        productName: `Rush processing: ${rushProduct.name}`,
        quantity: 1,
        unitPrice: feeRounded,
        lineTotal: feeRounded,
        picked: false,
        printData: null,
      });
      total += feeRounded;
    }

    if (outOfStock.length > 0) {
      throw new Error(`Out of stock: ${outOfStock.join("; ")}`);
    }

    const subtotal = total;
    const shippingCostNum = Math.max(0, Number(shippingCost) || 0);
    const shippingMethodStr = shippingMethod ? String(shippingMethod).trim() : null;
    const billingSel =
      billingSelection != null && String(billingSelection).trim() ? String(billingSelection).trim().slice(0, 500) : null;
    total = Math.round((subtotal + shippingCostNum) * 100) / 100;

    const order = await tx.order.create({
      data: {
        deploymentId: depId,
        customerName: String(customerName),
        customerEmail: String(customerEmail),
        customerPhone: customerPhone ? String(customerPhone) : null,
        shippingAddress: shippingAddress ? String(shippingAddress) : null,
        shippingCost: shippingCostNum,
        shippingMethod: shippingMethodStr,
        billingSelection: billingSel,
        discountAmount: 0,
        isRush: isRushOrder,
        status: initialStatus && String(initialStatus).trim() ? String(initialStatus).trim().toLowerCase() : "pending",
        total,
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    });

    return order;
  });
}

function findMany({ deploymentId, page = 1, limit = 50, status } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where = {};
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  if (status && status.trim()) {
    where.status = status.trim();
  }

  return prisma.$transaction([
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limitNum,
      skip,
    }),
    prisma.order.count({ where }),
  ]);
}

function findManyByEmail(email, { page = 1, limit = 20, deploymentId } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;
  const where = { customerEmail: String(email).trim() };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);

  return prisma.$transaction([
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limitNum,
      skip,
    }),
    prisma.order.count({ where }),
  ]);
}

function findById(id, deploymentId) {
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  return prisma.order.findFirst({
    where,
    include: { items: true },
  });
}

async function updateStatus(id, status, deploymentId) {
  const whereFind = { id: Number(id) };
  if (deploymentId != null) whereFind.deploymentId = Number(deploymentId);

  const existing = await prisma.order.findFirst({
    where: whereFind,
    include: { items: true },
  });
  if (!existing) {
    throw new Error("Order not found");
  }

  const statusNorm = String(status).trim().toLowerCase();
  const prev = String(existing.status || "").toLowerCase();

  const shouldRefundEasyPost =
    (statusNorm === "cancelled" || statusNorm === "rejected") && existing.easypostShipmentId;
  const easypostIdToRefund = shouldRefundEasyPost ? String(existing.easypostShipmentId).trim() : null;

  const updated = await prisma.$transaction(async (tx) => {
    const data = { status: statusNorm };

    if (statusNorm === "in process") {
      data.pickingStartedAt = new Date();
    } else if (statusNorm === "picked") {
      data.pickingCompletedAt = new Date();
    }

    if (shouldRefundEasyPost) {
      data.shippingLabelUrl = null;
      data.easypostShipmentId = null;
      data.trackingCode = null;
    }

    if (
      (statusNorm === "cancelled" || statusNorm === "rejected") &&
      existing.inventoryDeductedAt
    ) {
      await applyPodInventoryDelta(tx, existing, 1);
      data.inventoryDeductedAt = null;
    }

    if (statusNorm === "shipped" && prev !== "shipped" && !existing.inventoryDeductedAt) {
      await applyPodInventoryDelta(tx, existing, -1);
      data.inventoryDeductedAt = new Date();
    }

    return tx.order.update({
      where: { id: existing.id },
      data,
      include: { items: true },
    });
  });

  if (easypostIdToRefund) {
    try {
      const shippingService = require("./shipping.service");
      const result = await shippingService.refundShipment(easypostIdToRefund);
      if (!result.ok && !result.skipped) {
        console.warn("[order] EasyPost refund did not complete:", result.message);
      }
    } catch (e) {
      console.warn("[order] EasyPost refund error:", e.message);
    }
  }

  return updated;
}

async function updateItemPicked(orderId, itemId, picked, deploymentId) {
  const order = await findById(orderId, deploymentId);
  if (!order) return null;
  const item = await prisma.orderItem.findFirst({
    where: { id: Number(itemId), orderId: Number(orderId) },
  });
  if (!item) return null;
  await prisma.orderItem.update({
    where: { id: Number(itemId) },
    data: { picked: !!picked },
  });
  return findById(orderId, deploymentId);
}

async function updateItemQuantity(orderId, itemId, quantity, deploymentId) {
  const order = await findById(orderId, deploymentId);
  if (!order) return null;
  const item = await prisma.orderItem.findFirst({
    where: { id: Number(itemId), orderId: Number(orderId) },
  });
  if (!item) return null;
  const newQty = Math.max(1, Math.floor(Number(quantity) || 1));
  const lineTotal = Math.round(item.unitPrice * newQty * 100) / 100;
  await prisma.$transaction(async (tx) => {
    await tx.orderItem.update({
      where: { id: Number(itemId) },
      data: { quantity: newQty, lineTotal },
    });
    const items = await tx.orderItem.findMany({ where: { orderId: Number(orderId) } });
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const total = Math.round((subtotal + (order.shippingCost || 0) - (order.discountAmount || 0)) * 100) / 100;
    await tx.order.update({
      where: { id: Number(orderId) },
      data: { total },
    });
  });
  return findById(orderId, deploymentId);
}

async function updateLabelInfo(orderId, { shippingLabelUrl, trackingCode, easypostShipmentId }, deploymentId) {
  const where = { id: Number(orderId) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const data = {};
  if (shippingLabelUrl !== undefined) data.shippingLabelUrl = shippingLabelUrl || null;
  if (trackingCode !== undefined) data.trackingCode = trackingCode === "" || trackingCode === null ? null : String(trackingCode).trim();
  if (easypostShipmentId !== undefined) data.easypostShipmentId = easypostShipmentId || null;
  return prisma.order.update({
    where,
    data,
    include: { items: true },
  });
}

module.exports = {
  create,
  findMany,
  findManyByEmail,
  findById,
  updateStatus,
  updateItemPicked,
  updateItemQuantity,
  updateLabelInfo,
};
