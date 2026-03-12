/**
 * Report service - provides data for AI-powered reports.
 * All functions return structured data suitable for AI formatting.
 */
const prisma = require("../lib/prisma");

function parseDate(d) {
  if (!d) return null;
  const t = new Date(d).getTime();
  return isNaN(t) ? null : new Date(t);
}

async function getOrders({ status, dateFrom, dateTo, limit = 50 } = {}) {
  const where = {};
  if (status && status.trim()) where.status = status.trim();
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = parseDate(dateFrom) || new Date(0);
    if (dateTo) where.createdAt.lte = parseDate(dateTo) || new Date(9999, 11, 31);
  }
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
  return orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    status: o.status,
    total: o.total,
    itemCount: o.items?.reduce((s, i) => s + i.quantity, 0) || 0,
    createdAt: o.createdAt?.toISOString?.() || o.createdAt,
    pickingStartedAt: o.pickingStartedAt?.toISOString?.() || null,
    pickingCompletedAt: o.pickingCompletedAt?.toISOString?.() || null,
  }));
}

async function getOrdersSummary({ dateFrom, dateTo } = {}) {
  const where = {};
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = parseDate(dateFrom) || new Date(0);
    if (dateTo) where.createdAt.lte = parseDate(dateTo) || new Date(9999, 11, 31);
  }
  const orders = await prisma.order.findMany({
    where,
    select: { status: true, total: true, id: true },
  });
  const byStatus = {};
  let totalValue = 0;
  for (const o of orders) {
    const s = (o.status || "unknown").toLowerCase();
    byStatus[s] = (byStatus[s] || 0) + 1;
    totalValue += Number(o.total) || 0;
  }
  return {
    totalOrders: orders.length,
    byStatus,
    totalRevenue: Math.round(totalValue * 100) / 100,
  };
}

async function getSalesByPeriod({ period = "day", dateFrom, dateTo } = {}) {
  const orders = await prisma.order.findMany({
    where: { status: { not: "cancelled" } },
    select: { total: true, createdAt: true },
  });
  const buckets = {};
  for (const o of orders) {
    const d = new Date(o.createdAt);
    let key;
    if (period === "month") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else if (period === "week") {
      const start = new Date(d);
      start.setDate(start.getDate() - start.getDay());
      key = start.toISOString().slice(0, 10);
    } else {
      key = d.toISOString().slice(0, 10);
    }
    buckets[key] = (buckets[key] || 0) + Number(o.total) || 0;
  }
  const entries = Object.entries(buckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({ period: k, total: Math.round(v * 100) / 100 }));
  return entries;
}

async function getProducts({ category, lowStockOnly = false, limit = 100 } = {}) {
  const where = {};
  if (category && category.trim()) where.category = category.trim();
  if (lowStockOnly) where.quantity = { lte: 10 };
  const products = await prisma.product.findMany({
    where,
    select: { id: true, name: true, sku: true, quantity: true, price: true, category: true },
    orderBy: { name: "asc" },
    take: Math.min(limit, 200),
  });
  return products;
}

async function getLowStockProducts(threshold = 10) {
  const products = await prisma.product.findMany({
    where: { quantity: { lte: Number(threshold) || 10 } },
    select: { id: true, name: true, sku: true, quantity: true, price: true },
    orderBy: { quantity: "asc" },
  });
  return products;
}

async function getPickTimeStats({ dateFrom, dateTo } = {}) {
  const where = {
    pickingStartedAt: { not: null },
    pickingCompletedAt: { not: null },
  };
  if (dateFrom || dateTo) {
    where.pickingCompletedAt = {};
    if (dateFrom) where.pickingCompletedAt.gte = parseDate(dateFrom) || new Date(0);
    if (dateTo) where.pickingCompletedAt.lte = parseDate(dateTo) || new Date(9999, 11, 31);
  }
  const orders = await prisma.order.findMany({
    where,
    select: { pickingStartedAt: true, pickingCompletedAt: true },
  });
  const durations = orders.map((o) => {
    const start = new Date(o.pickingStartedAt).getTime();
    const end = new Date(o.pickingCompletedAt).getTime();
    return Math.round((end - start) / 1000);
  });
  if (durations.length === 0) {
    return { count: 0, averageSeconds: 0, minSeconds: 0, maxSeconds: 0 };
  }
  const sum = durations.reduce((a, b) => a + b, 0);
  return {
    count: durations.length,
    averageSeconds: Math.round(sum / durations.length),
    minSeconds: Math.min(...durations),
    maxSeconds: Math.max(...durations),
  };
}

async function getInventoryLogs({ limit = 50, action } = {}) {
  const where = {};
  if (action && action.trim()) where.action = action.trim();
  const logs = await prisma.inventoryLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });
  return logs.map((l) => ({
    id: l.id,
    sku: l.sku,
    productName: l.productName,
    action: l.action,
    quantityBefore: l.quantityBefore,
    quantityAfter: l.quantityAfter,
    source: l.source,
    createdAt: l.createdAt?.toISOString?.() || l.createdAt,
  }));
}

async function getTopProductsByQuantity({ limit = 10, dateFrom, dateTo } = {}) {
  const orderWhere = { status: { not: "cancelled" } };
  if (dateFrom || dateTo) {
    orderWhere.createdAt = {};
    if (dateFrom) orderWhere.createdAt.gte = parseDate(dateFrom) || new Date(0);
    if (dateTo) orderWhere.createdAt.lte = parseDate(dateTo) || new Date(9999, 11, 31);
  }
  const items = await prisma.orderItem.findMany({
    where: { order: orderWhere },
    select: { productName: true, sku: true, quantity: true, unitPrice: true },
  });
  const byProduct = {};
  for (const i of items) {
    const key = i.sku || i.productName;
    if (!byProduct[key]) {
      byProduct[key] = { productName: i.productName, sku: i.sku, quantity: 0, revenue: 0 };
    }
    byProduct[key].quantity += i.quantity;
    byProduct[key].revenue += (i.quantity || 0) * (i.unitPrice || 0);
  }
  return Object.values(byProduct)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, Math.min(limit, 50))
    .map((p) => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }));
}

/** Execute a report function by name with params */
async function runReport(name, params = {}) {
  const fns = {
    getOrders,
    getOrdersSummary,
    getSalesByPeriod,
    getProducts,
    getLowStockProducts,
    getPickTimeStats,
    getInventoryLogs,
    getTopProductsByQuantity,
  };
  const fn = fns[name];
  if (!fn) throw new Error(`Unknown report: ${name}`);
  return fn(params);
}

module.exports = {
  runReport,
  getOrders,
  getOrdersSummary,
  getSalesByPeriod,
  getProducts,
  getLowStockProducts,
  getPickTimeStats,
  getInventoryLogs,
  getTopProductsByQuantity,
};
