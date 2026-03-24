const fs = require("fs");
const csv = require("csv-parser");
const productService = require("../services/product.service");
const productFileService = require("../services/productFile.service");
const wasabiService = require("../services/wasabi.service");
const labelService = require("../services/label.service");
const { mapRowToProduct } = require("../lib/csvParser");
const { canAccessProduct } = require("../lib/auth-helpers");

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;

function getFirstImageFile(files) {
  return (files || []).find((f) => IMAGE_EXT.test(f.filename));
}

async function withFileUrls(product) {
  if (!product) return product;
  if (product.files) {
    product.files = await Promise.all(
      product.files.map(async (f) => ({ ...f, url: await productFileService.getFileUrlAsync(f) }))
    );
  }
  const imageKey = product.imageUrl || getFirstImageFile(product.files)?.path;
  if (imageKey && wasabiService.isConfigured()) {
    const signedUrl = await wasabiService.getImageUrl(imageKey);
    product.imageUrl = signedUrl || product.imageUrl;
  } else if (!product.imageUrl) {
    const firstImage = getFirstImageFile(product.files);
    product.imageUrl = firstImage ? await productFileService.getFileUrlAsync(firstImage) : null;
  }
  return product;
}

async function withFileUrlsList(products) {
  return Promise.all((products || []).map(withFileUrls));
}

const getProducts = async (req, res, next) => {
  try {
    const groupId = req.query.groupId ?? req.get("X-User-Group-Id");
    const category = req.query.category;
    const user = req.user;
    const allowedGroupIds = user?.isAdmin ? null : (user?.groupIds?.length ? user.groupIds : null);

    if (groupId && !user?.isAdmin && allowedGroupIds?.length && !allowedGroupIds.includes(Number(groupId))) {
      return res.status(403).json({ message: "You do not have access to this group." });
    }

    const products = await productService.getAllProducts({
      deploymentId: req.deploymentId,
      groupId,
      allowedGroupIds,
      category,
    });
    res.status(200).json(await withFileUrlsList(products));
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const user = req.user;
    const allowedGroupIds = user?.isAdmin ? null : (user?.groupIds?.length ? user.groupIds : null);
    const categories = await productService.getCategories({
      deploymentId: req.deploymentId,
      allowedGroupIds,
    });
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductWithFiles(id, req.deploymentId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    const user = req.user;
    if (!user?.isAdmin && product.groupId != null) {
      const allowedGroupIds = user?.groupIds || [];
      if (!allowedGroupIds.includes(product.groupId)) {
        return res.status(403).json({ message: "You do not have access to this product." });
      }
    }
    res.status(200).json(await withFileUrls(product));
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const { name, sku, quantity, price, description, category, groupId, productType, isPrintOnDemand, printTemplateConfig, pricingMatrix, allowedQuantities, minOrderQty, maxOrderQty, rushFee } = req.body;

    if (!name || !sku || price === undefined) {
      return res.status(400).json({
        message: "name, sku, and price are required.",
      });
    }

    if (!req.user?.isAdmin) {
      const allowedGroupIds = req.user?.groupIds || [];
      if (allowedGroupIds.length === 0) {
        return res.status(403).json({ message: "You must be assigned to at least one group to create products." });
      }
      if (groupId != null && groupId !== "" && !allowedGroupIds.includes(Number(groupId))) {
        return res.status(403).json({ message: "You cannot create products in this group." });
      }
      if (!groupId || groupId === "") {
        return res.status(403).json({ message: "You must assign a group when creating products." });
      }
    }

    const product = await productService.createProduct({
      deploymentId: req.deploymentId,
      name,
      sku,
      quantity,
      price,
      description,
      category,
      groupId,
      productType,
      isPrintOnDemand,
      printTemplateConfig,
      pricingMatrix,
      allowedQuantities,
      minOrderQty,
      maxOrderQty,
      rushFee,
    });

    return res.status(201).json(await withFileUrls(product));
  } catch (error) {
    return next(error);
  }
};

const updateQuantity = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const { id } = req.params;
    const { quantity, adjust } = req.body;

    if (quantity === undefined && adjust === undefined) {
      return res.status(400).json({
        message: "Provide either quantity (hard count) or adjust (deduction amount).",
      });
    }

    const existing = await productService.getProductWithFiles(id);
    if (!existing) return res.status(404).json({ message: "Product not found." });
    if (!canAccessProduct(req.user, existing)) {
      return res.status(403).json({ message: "You do not have access to this product." });
    }

    const source = req.body.source || "manual";
    const product = await productService.updateQuantity(id, { quantity, adjust }, source);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const withFiles = await productService.getProductWithFiles(id);
    return res.status(200).json(await withFileUrls(withFiles || product));
  } catch (error) {
    if (error.message?.includes("Kit has no components")) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const { id } = req.params;
    const existing = await productService.getProductWithFiles(id);
    if (!existing) return res.status(404).json({ message: "Product not found." });
    if (!canAccessProduct(req.user, existing)) {
      return res.status(403).json({ message: "You do not have access to this product." });
    }
    const deleted = await productService.deleteProduct(id);
    if (!deleted) return res.status(404).json({ message: "Product not found." });
    return res.status(200).json({ message: "Product deleted.", id: deleted.id });
  } catch (error) {
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const { id } = req.params;
    const { name, sku, quantity, price, description, category, groupId, productType, isPrintOnDemand, printTemplateConfig, pricingMatrix, allowedQuantities, minOrderQty, maxOrderQty, rushFee } = req.body;

    if (!name || !sku || price === undefined) {
      return res.status(400).json({
        message: "name, sku, and price are required.",
      });
    }

    const existing = await productService.getProductWithFiles(id);
    if (!existing) return res.status(404).json({ message: "Product not found." });
    if (!canAccessProduct(req.user, existing)) {
      return res.status(403).json({ message: "You do not have access to this product." });
    }

    const product = await productService.updateProduct(id, {
      name,
      sku,
      quantity,
      price,
      description,
      category,
      groupId,
      productType,
      isPrintOnDemand,
      printTemplateConfig,
      pricingMatrix,
      allowedQuantities,
      minOrderQty,
      maxOrderQty,
      rushFee,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    const withFiles = await productService.getProductWithFiles(id);
    return res.status(200).json(await withFileUrls(withFiles || product));
  } catch (error) {
    return next(error);
  }
};

const exportCsv = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const groupId = req.query.groupId ?? req.get("X-User-Group-Id");
    const user = req.user;
    const allowedGroupIds = user?.isAdmin ? null : (user?.groupIds || []);
    if (groupId && !user?.isAdmin && allowedGroupIds?.length && !allowedGroupIds.includes(Number(groupId))) {
      return res.status(403).json({ message: "You do not have access to this group." });
    }
    const products = await productService.getAllProducts({
      deploymentId: req.deploymentId,
      groupId,
      allowedGroupIds,
    });
    const header = "name,sku,quantity,price,description\n";
    const rows = products.map((p) => {
      const desc = (p.description || "").replace(/"/g, '""');
      return `"${(p.name || "").replace(/"/g, '""')}","${p.sku}",${p.quantity},${p.price},"${desc}"`;
    });
    const csv = header + rows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="inventory-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

const importCsv = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required for CSV import." });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    const products = rows.map(mapRowToProduct).filter(Boolean);
    if (products.length === 0) {
      return res.status(400).json({ message: "No valid rows found. Ensure CSV has name and sku columns." });
    }

    const { updated, created } = await productService.importFromCsv(products, req.deploymentId);

    try { fs.unlinkSync(file.path); } catch (_) {}

    res.status(200).json({
      message: "Import complete.",
      updated,
      created,
      total: products.length,
    });
  } catch (error) {
    next(error);
  }
};

const getLabel = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const { id } = req.params;
    const product = await productService.getProductWithFiles(id, req.deploymentId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    if (!canAccessProduct(req.user, product)) {
      return res.status(403).json({ message: "You do not have access to this product." });
    }
    const pdf = await labelService.generateLabel(product);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="label-${product.sku.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getCategories,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateQuantity,
  exportCsv,
  importCsv,
  getLabel,
};
