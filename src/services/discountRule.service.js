const prisma = require("../lib/prisma");

function findMany(deploymentId) {
  return prisma.orderDiscountRule.findMany({
    where: { deploymentId: Number(deploymentId) },
    orderBy: [{ sortOrder: "desc" }, { id: "asc" }],
  });
}

function create(deploymentId, data) {
  return prisma.orderDiscountRule.create({
    data: {
      deploymentId: Number(deploymentId),
      name: String(data.name || "").trim() || "Discount",
      type: data.type === "fixed" ? "fixed" : "percent",
      value: Math.max(0, Number(data.value) || 0),
      minDistinctProducts: Math.max(0, Math.floor(Number(data.minDistinctProducts) || 0)),
      minQuantity: Math.max(0, Math.floor(Number(data.minQuantity) || 0)),
      minSubtotal: Math.max(0, Number(data.minSubtotal) || 0),
      sortOrder: Number(data.sortOrder) || 0,
    },
  });
}

function update(id, deploymentId, data) {
  return prisma.orderDiscountRule.update({
    where: { id: Number(id), deploymentId: Number(deploymentId) },
    data: {
      ...(data.name != null && { name: String(data.name).trim() || "Discount" }),
      ...(data.type != null && { type: data.type === "fixed" ? "fixed" : "percent" }),
      ...(data.value != null && { value: Math.max(0, Number(data.value)) }),
      ...(data.minDistinctProducts != null && { minDistinctProducts: Math.max(0, Math.floor(Number(data.minDistinctProducts))) }),
      ...(data.minQuantity != null && { minQuantity: Math.max(0, Math.floor(Number(data.minQuantity))) }),
      ...(data.minSubtotal != null && { minSubtotal: Math.max(0, Number(data.minSubtotal)) }),
      ...(data.sortOrder != null && { sortOrder: Number(data.sortOrder) }),
    },
  });
}

function remove(id, deploymentId) {
  return prisma.orderDiscountRule.delete({
    where: { id: Number(id), deploymentId: Number(deploymentId) },
  });
}

/**
 * Find the best applicable discount for a cart.
 * @param {number} deploymentId
 * @param {Array<{ productId: number, quantity: number, price?: number }>} items - Cart items
 * @param {number} subtotal - Sum of (price * quantity) for all items
 * @returns {{ discountAmount: number, ruleName?: string } | null}
 */
async function findBestDiscount(deploymentId, items, subtotal) {
  const rules = await findMany(deploymentId);
  if (!rules.length) return null;

  const distinctProductCount = new Set(items.map((i) => i.productId)).size;
  const totalQuantity = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

  for (const rule of rules) {
    if (rule.minDistinctProducts > 0 && distinctProductCount < rule.minDistinctProducts) continue;
    if (rule.minQuantity > 0 && totalQuantity < rule.minQuantity) continue;
    if (rule.minSubtotal > 0 && subtotal < rule.minSubtotal) continue;

    let discountAmount = 0;
    if (rule.type === "percent") {
      discountAmount = Math.round((subtotal * (rule.value / 100)) * 100) / 100;
    } else {
      discountAmount = Math.min(rule.value, subtotal);
    }
    if (discountAmount <= 0) continue;

    return {
      discountAmount,
      ruleName: rule.name,
    };
  }
  return null;
}

module.exports = {
  findMany,
  create,
  update,
  remove,
  findBestDiscount,
};
