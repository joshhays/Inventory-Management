const prisma = require("../lib/prisma");

function findMany(deploymentId) {
  return prisma.shippingTier.findMany({
    where: { deploymentId: Number(deploymentId) },
    orderBy: [{ sortOrder: "asc" }, { minQuantity: "asc" }],
  });
}

function create(deploymentId, data) {
  return prisma.shippingTier.create({
    data: {
      deploymentId: Number(deploymentId),
      minQuantity: Math.max(0, Number(data.minQuantity) || 0),
      weightLbs: Math.max(0.1, Number(data.weightLbs) || 1),
      lengthInches: Math.max(1, Number(data.lengthInches) || 8),
      widthInches: Math.max(1, Number(data.widthInches) || 5),
      heightInches: Math.max(1, Number(data.heightInches) || 5),
      name: data.name ? String(data.name).trim() : null,
      sortOrder: Number(data.sortOrder) || 0,
    },
  });
}

function update(id, deploymentId, data) {
  return prisma.shippingTier.update({
    where: {
      id: Number(id),
      deploymentId: Number(deploymentId),
    },
    data: {
      ...(data.minQuantity != null && { minQuantity: Math.max(0, Number(data.minQuantity)) }),
      ...(data.weightLbs != null && { weightLbs: Math.max(0.1, Number(data.weightLbs)) }),
      ...(data.lengthInches != null && { lengthInches: Math.max(1, Number(data.lengthInches)) }),
      ...(data.widthInches != null && { widthInches: Math.max(1, Number(data.widthInches)) }),
      ...(data.heightInches != null && { heightInches: Math.max(1, Number(data.heightInches)) }),
      ...(data.name != null && { name: data.name ? String(data.name).trim() : null }),
      ...(data.sortOrder != null && { sortOrder: Number(data.sortOrder) }),
    },
  });
}

function remove(id, deploymentId) {
  return prisma.shippingTier.delete({
    where: {
      id: Number(id),
      deploymentId: Number(deploymentId),
    },
  });
}

/**
 * Find the tier that applies for the given item count.
 * Picks the tier with highest minQuantity where minQuantity <= itemCount.
 */
function findTierForQuantity(deploymentId, itemCount) {
  return prisma.shippingTier.findFirst({
    where: {
      deploymentId: Number(deploymentId),
      minQuantity: { lte: itemCount },
    },
    orderBy: [{ minQuantity: "desc" }],
  });
}

module.exports = {
  findMany,
  create,
  update,
  remove,
  findTierForQuantity,
};
