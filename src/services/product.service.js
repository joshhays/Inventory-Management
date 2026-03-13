const prisma = require("../lib/prisma");
const inventoryLog = require("./inventoryLog.service");

/** Calculate kit quantity from child products: min(floor(child.qty / qtyPerKit)) */
const calculateKitQuantity = async (kitId) => {
  const items = await prisma.kitItem.findMany({
    where: { kitId: Number(kitId) },
    include: { product: true },
  });
  if (items.length === 0) return 0;
  let minAvailable = Infinity;
  for (const item of items) {
    const childQty = item.product.quantity;
    const qtyPerKit = Math.max(1, item.quantity);
    const available = Math.floor(childQty / qtyPerKit);
    minAvailable = Math.min(minAvailable, available);
  }
  return minAvailable === Infinity ? 0 : minAvailable;
};

const getAllProducts = async (options = {}) => {
  const { groupId, allowedGroupIds, category } = options;
  const conditions = [];

  if (category != null && category !== "") {
    conditions.push({ category: String(category).trim() });
  }

  if (allowedGroupIds !== null && allowedGroupIds !== undefined && allowedGroupIds.length > 0) {
    conditions.push({
      OR: [{ groupId: null }, { groupId: { in: allowedGroupIds } }],
    });
  }

  if (groupId != null && groupId !== "") {
    const gid = Number(groupId);
    if (!isNaN(gid)) {
      conditions.push({
        OR: [{ groupId: null }, { groupId: gid }],
      });
    }
  }

  const where = conditions.length ? { AND: conditions } : {};
  const products = await prisma.product.findMany({
    where,
    include: {
      files: true,
      group: true,
      kitItems: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return products;
};

const createProduct = (productData) => {
  const isKit = productData.productType === "kit";
  return prisma.product.create({
    data: {
      name: productData.name,
      sku: productData.sku,
      quantity: isKit ? 0 : (Number(productData.quantity) || 0),
      price: Number(productData.price) || 0,
      description: productData.description,
      category: productData.category ? String(productData.category).trim() : null,
      productType: isKit ? "kit" : "regular",
      isPrintOnDemand: !!productData.isPrintOnDemand,
      printTemplateConfig:
        productData.printTemplateConfig != null && String(productData.printTemplateConfig).trim()
          ? String(productData.printTemplateConfig).trim()
          : null,
      ...(productData.groupId != null && productData.groupId !== "" && {
        groupId: Number(productData.groupId) || null,
      }),
    },
    include: { files: true, group: true, kitItems: { include: { product: true } } },
  });
};

const updateProduct = async (id, productData) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { kitItems: true },
  });
  if (!product) return null;

  const isKit = product.productType === "kit";
  const qtyBefore = product.quantity;
  const newQty = productData.quantity !== undefined
    ? Math.max(0, Math.floor(Number(productData.quantity)))
    : product.quantity;

  const updated = await prisma.product.update({
    where: { id: Number(id) },
    data: {
      ...(productData.name != null && { name: productData.name }),
      ...(productData.sku != null && { sku: productData.sku }),
      ...(productData.quantity !== undefined && !isKit && { quantity: newQty }),
      ...(productData.price !== undefined && { price: Number(productData.price) }),
      ...(productData.description !== undefined && { description: productData.description }),
      ...(productData.category !== undefined && {
        category: productData.category == null || productData.category === "" ? null : String(productData.category).trim(),
      }),
      ...(productData.productType !== undefined && { productType: productData.productType }),
      ...(productData.groupId !== undefined && {
        groupId: productData.groupId == null || productData.groupId === "" ? null : Number(productData.groupId),
      }),
      ...(productData.isPrintOnDemand !== undefined && { isPrintOnDemand: !!productData.isPrintOnDemand }),
      ...(productData.printTemplateConfig !== undefined && {
        printTemplateConfig:
          productData.printTemplateConfig == null || String(productData.printTemplateConfig).trim() === ""
            ? null
            : String(productData.printTemplateConfig).trim(),
      }),
    },
  });

  if (!isKit && qtyBefore !== newQty) {
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
    include: { files: true, group: true, kitItems: { include: { product: true } } },
  });
};

const updateQuantity = async (id, { quantity, adjust }, source = "manual") => {
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { kitItems: { include: { product: true } } },
  });
  if (!product) return null;

  if (product.productType === "kit") {
    return updateKitQuantity(product, { quantity, adjust }, source);
  }

  let newQty = product.quantity;
  let action = "hard_count";
  if (quantity !== undefined) {
    newQty = Math.max(0, Math.floor(Number(quantity)));
  } else if (adjust !== undefined) {
    const delta = Math.floor(Number(adjust));
    newQty = Math.max(0, product.quantity + delta);
    action = delta < 0
      ? (source.startsWith("offline_ship") ? "offline_ship" : "deduct")
      : source === "receive" ? "receive" : "add";
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

/** Apply kit quantity change.
 * Build kit (positive/receive) = deduct from children (consume components), add to kit quantity.
 * Deduct/sell (negative) = deduct from kit's stored quantity only (shipping built kits). */
const updateKitQuantity = async (kit, { quantity, adjust }, source = "manual") => {
  const items = kit.kitItems || [];
  if (items.length === 0) {
    throw new Error("Kit has no components. Add products to the kit first.");
  }

  let kitDelta = 0;
  if (quantity !== undefined) {
    const currentQty = kit.quantity ?? 0;
    kitDelta = Math.floor(Number(quantity)) - currentQty;
  } else if (adjust !== undefined) {
    kitDelta = Math.floor(Number(adjust));
  }
  if (kitDelta === 0) {
    return prisma.product.findUnique({
      where: { id: kit.id },
      include: { files: true, group: true, kitItems: { include: { product: true } } },
    });
  }

  const isBuilding = kitDelta > 0;
  const action = isBuilding ? "kit" : (kitDelta < 0 ? (source.startsWith("offline_ship") ? "offline_ship" : "deduct") : "add");
  const childSource = source.startsWith("offline_ship") ? source : `kit:${kit.sku}`;
  const kitsToProcess = Math.abs(kitDelta);

  if (isBuilding) {
    for (const item of items) {
      const qtyPerKit = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const amountToDeduct = kitsToProcess * qtyPerKit;

      const child = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!child) continue;
      if (child.quantity < amountToDeduct) {
        throw new Error(
          `Not enough "${child.name}" (${child.sku}): need ${amountToDeduct}, have ${child.quantity}. ` +
          `Cannot build ${kitsToProcess} kit(s) requiring ${qtyPerKit}× each.`
        );
      }
      const newChildQty = child.quantity - amountToDeduct;

      await prisma.product.update({
        where: { id: child.id },
        data: { quantity: newChildQty },
      });
      await inventoryLog.create({
        productId: child.id,
        sku: child.sku,
        productName: child.name,
        action,
        quantityBefore: child.quantity,
        quantityAfter: newChildQty,
        source: childSource,
      });
    }
  }

  const newKitQty = Math.max(0, (kit.quantity ?? 0) + kitDelta);
  await prisma.product.update({
    where: { id: kit.id },
    data: { quantity: newKitQty },
  });
  await inventoryLog.create({
    productId: kit.id,
    sku: kit.sku,
    productName: kit.name,
    action: isBuilding ? "kit" : (source.startsWith("offline_ship") ? "offline_ship" : "deduct"),
    quantityBefore: kit.quantity ?? 0,
    quantityAfter: newKitQty,
    source,
  });

  return prisma.product.findUnique({
    where: { id: kit.id },
    include: { files: true, group: true, kitItems: { include: { product: true } } },
  });
};

const getProductWithFiles = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { files: true, group: true, kitItems: { include: { product: true } } },
  });
  return product;
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
          ...(row.category != null && { category: row.category }),
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
          category: row.category || null,
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

const getCategories = async (options = {}) => {
  const products = await getAllProducts(options);
  const set = new Set();
  for (const p of products) {
    if (p.category && p.category.trim()) set.add(p.category.trim());
  }
  return Array.from(set).sort();
};

module.exports = {
  getAllProducts,
  getCategories,
  createProduct,
  updateProduct,
  updateQuantity,
  getProductWithFiles,
  importFromCsv,
  calculateKitQuantity,
};
