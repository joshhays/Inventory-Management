const prisma = require("../lib/prisma");

function create({ productId, sku, productName, action, quantityBefore, quantityAfter, source = "manual" }) {
  return prisma.inventoryLog.create({
    data: {
      productId: productId ?? undefined,
      sku,
      productName,
      action,
      quantityBefore,
      quantityAfter,
      source,
    },
  });
}

function buildWhere({ search, action } = {}) {
  const where = {};
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { sku: { contains: term } },
      { productName: { contains: term } },
    ];
  }
  if (action && action.trim()) {
    where.action = action.trim();
  }
  return where;
}

function count({ search, action } = {}) {
  return prisma.inventoryLog.count({
    where: buildWhere({ search, action }),
  });
}

function findMany({ search, action, limit = 50, offset = 0 } = {}) {
  const where = buildWhere({ search, action });
  return prisma.inventoryLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(1, limit), 100),
    skip: Math.max(0, offset),
  });
}

function getActions() {
  return prisma.inventoryLog.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  }).then((rows) => rows.map((r) => r.action));
}

module.exports = {
  create,
  findMany,
  count,
  getActions,
};
