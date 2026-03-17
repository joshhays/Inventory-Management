const prisma = require("../lib/prisma");

function create({ deploymentId, customerName, customerEmail, customerPhone, shippingAddress, shippingCost, shippingMethod, items }) {
  if (!deploymentId) throw new Error("Deployment is required.");
  const depId = Number(deploymentId);
  return prisma.$transaction(async (tx) => {
    let total = 0;
    const orderItems = [];
    const outOfStock = [];

    for (const item of items) {
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

      const unitPrice = product.price;
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

    if (outOfStock.length > 0) {
      throw new Error(`Out of stock: ${outOfStock.join("; ")}`);
    }

    const shippingCostNum = Math.max(0, Number(shippingCost) || 0);
    const shippingMethodStr = shippingMethod ? String(shippingMethod).trim() : null;
    total = Math.round((total + shippingCostNum) * 100) / 100;

    const order = await tx.order.create({
      data: {
        deploymentId: depId,
        customerName: String(customerName),
        customerEmail: String(customerEmail),
        customerPhone: customerPhone ? String(customerPhone) : null,
        shippingAddress: shippingAddress ? String(shippingAddress) : null,
        shippingCost: shippingCostNum,
        shippingMethod: shippingMethodStr,
        status: "pending",
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
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const statusNorm = String(status).trim().toLowerCase();
  const data = { status: statusNorm };

  if (statusNorm === "in process") {
    data.pickingStartedAt = new Date();
  } else if (statusNorm === "picked") {
    data.pickingCompletedAt = new Date();
  }

  return prisma.order.update({
    where,
    data,
    include: { items: true },
  });
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

module.exports = {
  create,
  findMany,
  findManyByEmail,
  findById,
  updateStatus,
  updateItemPicked,
};
