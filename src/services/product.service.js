const prisma = require("../lib/prisma");
const inventoryLog = require("./inventoryLog.service");

const getAllProducts = (options = {}) => {
  const { groupId } = options;
  const where = {};
  if (groupId != null && groupId !== "") {
    const gid = Number(groupId);
    if (!isNaN(gid)) {
      where.OR = [
        { groupId: null },
        { groupId: gid },
      ];
    }
  }
  return prisma.product.findMany({
    where,
    include: { files: true, group: true },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const createProduct = (productData) => {
  return prisma.product.create({
    data: {
      name: productData.name,
      sku: productData.sku,
      quantity: Number(productData.quantity) || 0,
      price: Number(productData.price) || 0,
      description: productData.description,
      ...(productData.groupId != null && productData.groupId !== "" && {
        groupId: Number(productData.groupId) || null,
      }),
    },
    include: { files: true, group: true },
  });
};

const updateProduct = async (id, productData) => {
  const product = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!product) return null;

  const qtyBefore = product.quantity;
  const newQty = productData.quantity !== undefined
    ? Math.max(0, Math.floor(Number(productData.quantity)))
    : product.quantity;

  const updated = await prisma.product.update({
    where: { id: Number(id) },
    data: {
      ...(productData.name != null && { name: productData.name }),
      ...(productData.sku != null && { sku: productData.sku }),
      ...(productData.quantity !== undefined && { quantity: newQty }),
      ...(productData.price !== undefined && { price: Number(productData.price) }),
      ...(productData.description !== undefined && { description: productData.description }),
      ...(productData.groupId !== undefined && {
        groupId: productData.groupId == null || productData.groupId === "" ? null : Number(productData.groupId),
      }),
    },
  });

  if (qtyBefore !== newQty) {
    await inventoryLog.create({
      productId: product.id,
      sku: updated.sku,
      productName: updated.name,
      action: "hard_count",
      quantityBefore: qtyBefore,
      quantityAfter: newQty,
      source: "manual",
    });
  }

  return prisma.product.findUnique({
    where: { id: Number(id) },
    include: { files: true, group: true },
  });
};

const updateQuantity = async (id, { quantity, adjust }, source = "manual") => {
  const product = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!product) return null;

  let newQty = product.quantity;
  let action = "hard_count";
  if (quantity !== undefined) {
    newQty = Math.max(0, Math.floor(Number(quantity)));
  } else if (adjust !== undefined) {
    const delta = Math.floor(Number(adjust));
    newQty = Math.max(0, product.quantity + delta);
    action = delta < 0 ? "deduct" : source === "receive" ? "receive" : "add";
  }

  const updated = await prisma.product.update({
    where: { id: Number(id) },
    data: { quantity: newQty },
  });

  await inventoryLog.create({
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    action,
    quantityBefore: product.quantity,
    quantityAfter: newQty,
    source,
  });

  return updated;
};

const getProductWithFiles = (id) => {
  return prisma.product.findUnique({
    where: { id: Number(id) },
    include: { files: true, group: true },
  });
};

const importFromCsv = async (rows) => {
  let updated = 0;
  let created = 0;

  for (const row of rows) {
    const existing = await prisma.product.findUnique({ where: { sku: row.sku } });
    if (existing) {
      const qtyBefore = existing.quantity;
      await prisma.product.update({
        where: { sku: row.sku },
        data: {
          name: row.name,
          quantity: row.quantity,
          price: row.price,
          description: row.description,
        },
      });
      await inventoryLog.create({
        productId: existing.id,
        sku: existing.sku,
        productName: row.name,
        action: "import",
        quantityBefore: qtyBefore,
        quantityAfter: row.quantity,
        source: "import",
      });
      updated++;
    } else {
      const createdProduct = await prisma.product.create({
        data: {
          name: row.name,
          sku: row.sku,
          quantity: row.quantity,
          price: row.price,
          description: row.description,
        },
      });
      await inventoryLog.create({
        productId: createdProduct.id,
        sku: createdProduct.sku,
        productName: createdProduct.name,
        action: "import",
        quantityBefore: 0,
        quantityAfter: createdProduct.quantity,
        source: "import",
      });
      created++;
    }
  }

  return { updated, created };
};

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  updateQuantity,
  getProductWithFiles,
  importFromCsv,
};
