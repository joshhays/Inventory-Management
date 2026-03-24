/**
 * Generates print PDFs for order items (POD/business card).
 *
 * - Approval PDF: includes master (base template) so approvers see full design.
 * - Email/print PDF: imprint-only (no base) for printer to composite.
 */

const path = require("path");
const fs = require("fs");
const { generateImprintOnlyPdf, generateBusinessCardPdf, cropPdfToTrim } = require("./podPdf.service");
const { businessCardTemplate } = require("../podTemplates");
const productFileService = require("./productFile.service");
const prisma = require("../lib/prisma");
const wasabiService = require("./wasabi.service");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
const PRODUCT_FILES_DIR = path.join(__dirname, "../../product-files");
const POD_BASE_PDF = path.join(__dirname, "../../product-files/business-card-base.pdf");
const PDF_EXT = /\.pdf$/i;

function parseUserData(item) {
  if (!item?.printData || typeof item.printData !== "string" || !item.printData.trim()) return null;
  try {
    const userData = JSON.parse(item.printData);
    return Object.keys(userData).length > 0 ? userData : null;
  } catch {
    return null;
  }
}

function getTemplateConfig(product) {
  if (!product?.printTemplateConfig || typeof product.printTemplateConfig !== "string") return businessCardTemplate;
  try {
    const parsed = JSON.parse(product.printTemplateConfig);
    if (parsed?.fields && Array.isArray(parsed.fields) && parsed.fields.length > 0) return parsed;
  } catch (_) {}
  return businessCardTemplate;
}

async function getBasePdfBytesForProduct(product) {
  if (!product?.id) return null;
  const files = await productFileService.getByProductId(product.id);
  const pdfFile = files.find((f) => PDF_EXT.test(f.filename || ""));
  if (!pdfFile) return null;

  const p = pdfFile.path || "";
  const isRepo = p && !p.startsWith("product-") && !p.startsWith("uploads/");
  const isWasabi = p.startsWith("uploads/");

  if (isRepo) {
    const fullPath = path.join(PRODUCT_FILES_DIR, p);
    if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);
    return null;
  }
  if (isWasabi && wasabiService.isConfigured()) {
    return await wasabiService.getFileBuffer(p);
  }
  const fullPath = path.join(UPLOAD_DIR, p);
  if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);
  return null;
}

/**
 * Generate approval PDF with master (base template + customer data).
 * Used when approvers view the proof during approval.
 * @param {Object} item - OrderItem with printData, productId
 * @param {Object} [product] - Product with printTemplateConfig, files (optional - fetched if missing)
 * @returns {Promise<Buffer|null>}
 */
async function generateApprovalPdfForItem(item, product = null) {
  const userData = parseUserData(item);
  if (!userData) return null;

  let prod = product;
  if (!prod && item.productId) {
    prod = await prisma.product.findUnique({
      where: { id: Number(item.productId) },
      select: { id: true, printTemplateConfig: true },
    });
  }
  const templateConfig = getTemplateConfig(prod);
  let basePdfBytes = prod ? await getBasePdfBytesForProduct(prod) : null;
  if (!basePdfBytes && fs.existsSync(POD_BASE_PDF)) {
    basePdfBytes = fs.readFileSync(POD_BASE_PDF);
  }
  if (!basePdfBytes) {
    return generateImprintOnlyPdf(userData, templateConfig);
  }
  const pdfBuffer = await generateBusinessCardPdf(basePdfBytes, userData, templateConfig);
  return cropPdfToTrim(pdfBuffer);
}

/**
 * Generate imprint-only PDF (no base/master). For printer to composite.
 * Used in ORDER_READY_FOR_PRINT email after approval.
 * @param {Object} item - OrderItem with printData, productId
 * @param {Object} [product] - Optional product with printTemplateConfig
 * @returns {Promise<Buffer|null>}
 */
async function generatePrintPdfForItem(item, product = null) {
  const userData = parseUserData(item);
  if (!userData) return null;
  let prod = product;
  if (!prod && item.productId) {
    prod = await prisma.product.findUnique({
      where: { id: Number(item.productId) },
      select: { printTemplateConfig: true },
    });
  }
  const templateConfig = getTemplateConfig(prod);
  return generateImprintOnlyPdf(userData, templateConfig);
}

module.exports = {
  generateApprovalPdfForItem,
  generatePrintPdfForItem,
};
