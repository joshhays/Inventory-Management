const fs = require("fs");
const path = require("path");
const os = require("os");
const prisma = require("../lib/prisma");
const productFileService = require("../services/productFile.service");
const productService = require("../services/product.service");
const { canAccessProduct } = require("../lib/auth-helpers");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
const PRODUCT_FILES_DIR = path.join(__dirname, "../../product-files");
const POD_BASE_PDF = path.join(__dirname, "../../product-files/business-card-base.pdf");

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
    if (req.user) {
      const access = await checkProductAccess(req, res, id);
      if (access.status) return res.status(access.status).json({ message: access.message });
    }
    const files = await productFileService.getByProductId(id);
    const withUrls = files.map((f) => ({ ...f, url: productFileService.getFileUrl(f) }));
    res.status(200).json(withUrls);
  } catch (error) {
    next(error);
  }
};

const getPreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductWithFiles(id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    if (req.user) {
      const access = await checkProductAccess(req, res, id);
      if (access.status) return res.status(access.status).json({ message: access.message });
    }

    const files = product.files || [];
    const pdfFile = files.find((f) => PDF_EXT.test(f.filename));
    const imageFile = files.find((f) => IMAGE_EXT.test(f.filename));

    const getBaseDir = (f) => (productFileService.getFileUrl(f)?.startsWith("/product-files/") ? PRODUCT_FILES_DIR : UPLOAD_DIR);

    if (imageFile) {
      const fullPath = path.join(getBaseDir(imageFile), imageFile.path);
      if (fs.existsSync(fullPath)) {
        return res.sendFile(path.resolve(fullPath));
      }
    }

    let fullPath = null;
    if (pdfFile) {
      fullPath = path.join(getBaseDir(pdfFile), pdfFile.path);
      if (fs.existsSync(fullPath)) {
        // Use product's PDF
      } else {
        fullPath = null;
      }
    }

    // Fallback for POD products with no files: use base business card PDF
    if (!fullPath && product.isPrintOnDemand && fs.existsSync(POD_BASE_PDF)) {
      const { generateBusinessCardPdf } = require("../services/podPdf.service");
      const { businessCardTemplate } = require("../podTemplates");
      const basePdfBytes = fs.readFileSync(POD_BASE_PDF);
      const pdfBuffer = await generateBusinessCardPdf(basePdfBytes, {}, businessCardTemplate);
      const { pdf } = require("pdf-to-img");
      // v3 accepts file path; write buffer to temp file for compatibility
      const tmpPath = path.join(os.tmpdir(), `pod-preview-${Date.now()}.pdf`);
      try {
        fs.writeFileSync(tmpPath, pdfBuffer);
        const document = await pdf(tmpPath, { scale: 2 });
        let firstPage = null;
        for await (const image of document) {
          firstPage = image;
          break;
        }
        if (firstPage) {
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "public, max-age=3600");
          return res.send(firstPage);
        }
      } finally {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      }
    }

    if (!fullPath) {
      return res.status(404).json({ message: "No image or PDF file found. For POD products, add business-card-base.pdf to product-files." });
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

const attachFile = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const { id } = req.params;
    const access = await checkProductAccess(req, res, id);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const { path: filePath } = req.body || {};
    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ message: "path is required (e.g. \"manual.pdf\" or \"guides/spec.pdf\")." });
    }
    const cleanPath = filePath.replace(/^\/+/, "").replace(/\.\./g, "");
    const productFile = await productFileService.addFromRepo(id, cleanPath);
    if (!productFile) {
      return res.status(404).json({ message: "Product or file not found. Ensure the file exists in product-files/." });
    }
    res.status(201).json({ ...productFile, url: productFileService.getFileUrl(productFile) });
  } catch (error) {
    next(error);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
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
  attachFile,
  deleteFile,
};
