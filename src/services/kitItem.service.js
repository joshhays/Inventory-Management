const prisma = require("../lib/prisma");
const productService = require("./product.service");

const getKitItems = async (kitId) => {
  return prisma.kitItem.findMany({
    where: { kitId: Number(kitId) },
    include: { product: true },
    orderBy: { id: "asc" },
  });
};

const addKitItem = async (kitId, { productId, quantity }) => {
  const kit = await prisma.product.findUnique({
    where: { id: Number(kitId) },
    include: { kitItems: true },
  });
  if (!kit) return null;
  if (kit.productType !== "kit") {
    throw new Error("Product is not a kit.");
  }
  const childId = Number(productId);
  if (childId === kitId) {
    throw new Error("A kit cannot contain itself.");
  }
  const child = await prisma.product.findUnique({ where: { id: childId } });
  if (!child) {
    throw new Error("Child product not found.");
  }
  if (child.productType === "kit") {
    throw new Error("Kits cannot contain other kits.");
  }
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));

  const existing = await prisma.kitItem.findUnique({
    where: { kitId_productId: { kitId: Number(kitId), productId: childId } },
  });
  if (existing) {
    return prisma.kitItem.update({
      where: { id: existing.id },
      data: { quantity: qty },
      include: { product: true },
    });
  }

  return prisma.kitItem.create({
    data: {
      kitId: Number(kitId),
      productId: childId,
      quantity: qty,
    },
    include: { product: true },
  });
};

const updateKitItem = async (kitId, itemId, { quantity }) => {
  const item = await prisma.kitItem.findFirst({
    where: { id: Number(itemId), kitId: Number(kitId) },
  });
  if (!item) return null;
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  return prisma.kitItem.update({
    where: { id: item.id },
    data: { quantity: qty },
    include: { product: true },
  });
};

const removeKitItem = async (kitId, itemId) => {
  const item = await prisma.kitItem.findFirst({
    where: { id: Number(itemId), kitId: Number(kitId) },
  });
  if (!item) return null;
  await prisma.kitItem.delete({ where: { id: item.id } });
  return { deleted: true };
};

module.exports = {
  getKitItems,
  addKitItem,
  updateKitItem,
  removeKitItem,
};
