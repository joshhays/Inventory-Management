const fs = require("fs");
const path = require("path");
const os = require("os");
const prisma = require("../lib/prisma");
const productFileService = require("../services/productFile.service");
const productService = require("../services/product.service");
const { canAccessProduct } = require("../lib/auth-helpers");
const { cropPdfToTrim } = require("../services/podPdf.service");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
const PRODUCT_FILES_DIR = path.join(__dirname, "../../product-files");
const POD_BASE_PDF = path.join(__dirname, "../../product-files/business-card-base.pdf");

// Placeholder when PDF-to-image conversion fails. Shows a neutral card icon so the product list looks intentional.
const PLACEHOLDER_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120"><rect fill="#f1f5f9" width="200" height="120"/><rect x="40" y="25" width="120" height="70" rx="4" fill="none" stroke="#cbd5e1" stroke-width="2"/><line x1="50" y1="45" x2="150" y2="45" stroke="#e2e8f0" stroke-width="1"/><line x1="50" y1="60" x2="120" y2="60" stroke="#e2e8f0" stroke-width="1"/><line x1="50" y1="75" x2="140" y2="75" stroke="#e2e8f0" stroke-width="1"/></svg>',
  "utf8"
);

async function checkProductAccess(req, res, productId) {
  const product = await productService.getProductWithFiles(productId, req.deploymentId);
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
    const withUrls = await Promise.all(
      files.map(async (f) => ({ ...f, url: await productFileService.getFileUrlAsync(f) }))
    );
    res.status(200).json(withUrls);
  } catch (error) {
    next(error);
  }
};

const getPreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductWithFiles(id, req.deploymentId);
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
      if (imageFile.path.startsWith("uploads/")) {
        const wasabiService = require("../services/wasabi.service");
        const signedUrl = await wasabiService.getImageUrl(imageFile.path);
        if (signedUrl) return res.redirect(signedUrl);
      }
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
      let pdfBuffer = await generateBusinessCardPdf(basePdfBytes, {}, businessCardTemplate);
      pdfBuffer = await cropPdfToTrim(pdfBuffer);
      try {
        const { pdf } = await import("pdf-to-img");
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
      } catch (_) {
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.send(PLACEHOLDER_SVG);
      }
    }

    if (!fullPath) {
      return res.status(404).json({ message: "No image or PDF file found. For POD products, add business-card-base.pdf to product-files." });
    }

    try {
      let pdfBuf = fs.readFileSync(fullPath);
      pdfBuf = await cropPdfToTrim(pdfBuf);
      const tmpPath = path.join(os.tmpdir(), `product-preview-${Date.now()}.pdf`);
      try {
        fs.writeFileSync(tmpPath, pdfBuf);
        const { pdf } = await import("pdf-to-img");
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
    } catch (_) {
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=60");
      return res.send(PLACEHOLDER_SVG);
    }

    return res.status(500).json({ message: "Could not generate preview." });
  } catch (error) {
    next(error);
  }
};

const uploadFile = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const { id } = req.params;
    const access = await checkProductAccess(req, res, id);
    if (access.status) return res.status(access.status).json({ message: access.message });
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const productFile = await productFileService.addFromWasabi(
      id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype || "application/octet-stream"
    );
    if (!productFile) {
      return res.status(500).json({ message: "Wasabi is not configured or upload failed." });
    }
    res.status(201).json({ ...productFile, url: await productFileService.getFileUrlAsync(productFile) });
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
    res.status(201).json({ ...productFile, url: await productFileService.getFileUrlAsync(productFile) });
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
  uploadFile,
  attachFile,
  deleteFile,
};
