/**
 * Generates print PDFs for order items (POD/business card).
 * Used by order.controller for download and mail.service for email attachments.
 */

const path = require("path");
const fs = require("fs");
const { generateBusinessCardPdf } = require("./podPdf.service");
const { businessCardTemplate } = require("../podTemplates");

const BASE_PDF_PATH = path.join(__dirname, "../../product-files/business-card-base.pdf");

/**
 * Generate the print PDF buffer for an order item with printData.
 * @param {Object} item - OrderItem with printData (JSON string)
 * @returns {Promise<Buffer|null>} PDF buffer or null if no print data / file missing
 */
async function generatePrintPdfForItem(item) {
  if (!item?.printData || typeof item.printData !== "string" || !item.printData.trim()) {
    return null;
  }
  let userData = {};
  try {
    userData = JSON.parse(item.printData);
  } catch {
    return null;
  }
  if (Object.keys(userData).length === 0) return null;
  if (!fs.existsSync(BASE_PDF_PATH)) return null;

  const basePdfBytes = fs.readFileSync(BASE_PDF_PATH);
  return generateBusinessCardPdf(basePdfBytes, userData, businessCardTemplate);
}

module.exports = {
  generatePrintPdfForItem,
};
