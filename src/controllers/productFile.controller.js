const fs = require("fs");
const path = require("path");
const productFileService = require("../services/productFile.service");
const productService = require("../services/product.service");
const { canAccessProduct } = require("../lib/auth-helpers");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

async function checkProductAccess(req, res, productId) {
  const product = await productService.getProductWithFiles(productId);
  if (!product) return { status: 404, message: "Product not found." };
  if (!canAccessProduct(req.user, product)) return { status: 403, message: "You do not have access to this product." };
  return { product };
}
const PDF_EXT = /\.pdf$/i;
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;

const getFiles = async (req, res, next) => {
  try {
    const { id } = req.params;
    const access = await checkProductAccess(req, res, id);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const files = await productFileService.getByProductId(id);
    res.status(200).json(files);
  } catch (error) {
    next(error);
  }
};

const getPreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const access = await checkProductAccess(req, res, id);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const product = access.product;

    const files = product.files || [];
    const pdfFile = files.find((f) => PDF_EXT.test(f.filename));
    const imageFile = files.find((f) => IMAGE_EXT.test(f.filename));

    // Prefer image, otherwise use first page of PDF only
    if (imageFile) {
      const fullPath = path.join(UPLOAD_DIR, imageFile.path);
      if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      }
    }

    if (!pdfFile) {
      return res.status(404).json({ message: "No image or PDF file found." });
    }

    const fullPath = path.join(UPLOAD_DIR, pdfFile.path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "File not found." });
    }

    const { pdf } = require("pdf-to-img");
    const document = await pdf(fullPath, { scale: 2 });
    let firstPage = null;
    for await (const image of document) {
      firstPage = image;
      break; // Only first page
    }

    if (!firstPage) {
      return res.status(500).json({ message: "Could not convert PDF." });
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(firstPage);
  } catch (error) {
    next(error);
  }
};

const uploadFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const access = await checkProductAccess(req, res, id);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const productFile = await productFileService.add(id, file);
    if (!productFile) {
      return res.status(404).json({ message: "Product not found." });
    }
    res.status(201).json(productFile);
  } catch (error) {
    next(error);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const { id, fileId } = req.params;
    const access = await checkProductAccess(req, res, id);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const file = await productFileService.remove(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }
    res.status(200).json({ message: "File deleted.", file });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFiles,
  getPreview,
  uploadFile,
  deleteFile,
};
