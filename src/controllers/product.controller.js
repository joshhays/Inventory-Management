const fs = require("fs");
const csv = require("csv-parser");
const productService = require("../services/product.service");
const labelService = require("../services/label.service");
const { mapRowToProduct } = require("../lib/csvParser");

const getProducts = async (req, res, next) => {
  try {
    const groupId = req.query.groupId ?? req.get("X-User-Group-Id");
    const products = await productService.getAllProducts({ groupId });
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductWithFiles(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, sku, quantity, price, description, groupId, productType } = req.body;

    if (!name || !sku || price === undefined) {
      return res.status(400).json({
        message: "name, sku, and price are required.",
      });
    }

    const product = await productService.createProduct({
      name,
      sku,
      quantity,
      price,
      description,
      groupId,
      productType,
    });

    return res.status(201).json(product);
  } catch (error) {
    return next(error);
  }
};

const updateQuantity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, adjust } = req.body;

    if (quantity === undefined && adjust === undefined) {
      return res.status(400).json({
        message: "Provide either quantity (hard count) or adjust (deduction amount).",
      });
    }

    const source = req.body.source || "manual";
    const product = await productService.updateQuantity(id, { quantity, adjust }, source);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const withFiles = await productService.getProductWithFiles(id);
    return res.status(200).json(withFiles || product);
  } catch (error) {
    if (error.message?.includes("Kit has no components")) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sku, quantity, price, description, groupId, productType } = req.body;

    if (!name || !sku || price === undefined) {
      return res.status(400).json({
        message: "name, sku, and price are required.",
      });
    }

    const product = await productService.updateProduct(id, {
      name,
      sku,
      quantity,
      price,
      description,
      groupId,
      productType,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    return res.status(200).json(product);
  } catch (error) {
    return next(error);
  }
};

const exportCsv = async (req, res, next) => {
  try {
    const groupId = req.query.groupId ?? req.get("X-User-Group-Id");
    const products = await productService.getAllProducts({ groupId });
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

    const { updated, created } = await productService.importFromCsv(products);

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
    const { id } = req.params;
    const product = await productService.getProductWithFiles(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
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
  getProduct,
  createProduct,
  updateQuantity,
  updateProduct,
  exportCsv,
  importCsv,
  getLabel,
};
