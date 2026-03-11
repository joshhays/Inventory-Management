const prisma = require("../lib/prisma");

function create({ customerName, customerEmail, customerPhone, shippingAddress, items }) {
  return prisma.$transaction(async (tx) => {
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const product = item.productId
        ? await tx.product.findUnique({ where: { id: Number(item.productId) } })
        : await tx.product.findUnique({ where: { sku: String(item.sku) } });

      if (!product) {
        throw new Error(`Product not found: ${item.productId || item.sku}`);
      }

      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const unitPrice = product.price;
      const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

      orderItems.push({
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        quantity,
        unitPrice,
        lineTotal,
      });
      total += lineTotal;
    }

    total = Math.round(total * 100) / 100;

    const order = await tx.order.create({
      data: {
        customerName: String(customerName),
        customerEmail: String(customerEmail),
        customerPhone: customerPhone ? String(customerPhone) : null,
        shippingAddress: shippingAddress ? String(shippingAddress) : null,
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

function findMany({ page = 1, limit = 50, status } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where = {};
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

function findById(id) {
  return prisma.order.findUnique({
    where: { id: Number(id) },
    include: { items: true },
  });
}

function updateStatus(id, status) {
  return prisma.order.update({
    where: { id: Number(id) },
    data: { status: String(status) },
    include: { items: true },
  });
}

module.exports = {
  create,
  findMany,
  findById,
  updateStatus,
};
