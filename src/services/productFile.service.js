const path = require("path");
const fs = require("fs");
const prisma = require("../lib/prisma");
const wasabiService = require("./wasabi.service");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
const PRODUCT_FILES_DIR = path.join(__dirname, "../../product-files");

function isRepoFile(filePath) {
  return filePath && !filePath.startsWith("product-") && !filePath.startsWith("uploads/");
}

const getByProductId = (productId) => {
  return prisma.productFile.findMany({
    where: { productId: Number(productId) },
    orderBy: { createdAt: "desc" },
  });
};

const add = async (productId, file) => {
  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) return null;

  const dir = path.join(UPLOAD_DIR, `product-${productId}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const ext = path.extname(file.originalname) || ".pdf";
  const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const relPath = `product-${productId}/${safeName}`;
  const destPath = path.join(UPLOAD_DIR, relPath);

  fs.renameSync(file.path, destPath);

  return prisma.productFile.create({
    data: {
      productId: Number(productId),
      filename: file.originalname,
      path: relPath,
    },
  });
};

const addFromRepo = async (productId, relPath) => {
  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) return null;

  const fullPath = path.join(PRODUCT_FILES_DIR, relPath);
  if (!fs.existsSync(fullPath)) return null;

  const filename = path.basename(relPath);
  return prisma.productFile.create({
    data: {
      productId: Number(productId),
      filename,
      path: relPath,
    },
  });
};

const addFromWasabi = async (productId, fileBuffer, fileName, contentType) => {
  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) return null;
  if (!wasabiService.isConfigured()) return null;

  const subfolder = `products/product-${productId}`;
  const key = await wasabiService.uploadFile(fileBuffer, fileName, contentType, subfolder);
  if (!key) return null;

  return prisma.productFile.create({
    data: {
      productId: Number(productId),
      filename: fileName,
      path: key,
    },
  });
};

const remove = async (fileId) => {
  const file = await prisma.productFile.findUnique({ where: { id: Number(fileId) } });
  if (!file) return null;

  if (!isRepoFile(file.path)) {
    const fullPath = path.join(UPLOAD_DIR, file.path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  await prisma.productFile.delete({ where: { id: Number(fileId) } });
  return file;
};

const getFileUrl = (file) => {
  if (!file?.path) return null;
  if (file.path.startsWith("uploads/")) return null; // Wasabi key - use getFileUrlAsync
  const encoded = file.path.split("/").map(encodeURIComponent).join("/");
  return isRepoFile(file.path) ? `/product-files/${encoded}` : `/uploads/${encoded}`;
};

/**
 * Get file URL - presigned when Wasabi is configured (for paths under uploads/), else local path.
 */
async function getFileUrlAsync(file) {
  if (!file?.path) return null;
  const isWasabiKey = file.path.startsWith("uploads/");
  if (isWasabiKey && wasabiService.isConfigured()) {
    const signed = await wasabiService.getImageUrl(file.path);
    if (signed) return signed;
  }
  return getFileUrl(file);
}

module.exports = {
  getByProductId,
  add,
  addFromRepo,
  addFromWasabi,
  remove,
  getFileUrl,
  getFileUrlAsync,
};
