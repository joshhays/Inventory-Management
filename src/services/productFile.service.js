const path = require("path");
const fs = require("fs");
const prisma = require("../lib/prisma");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

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

const remove = async (fileId) => {
  const file = await prisma.productFile.findUnique({ where: { id: Number(fileId) } });
  if (!file) return null;

  const fullPath = path.join(UPLOAD_DIR, file.path);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  await prisma.productFile.delete({ where: { id: Number(fileId) } });
  return file;
};

module.exports = {
  getByProductId,
  add,
  remove,
};
