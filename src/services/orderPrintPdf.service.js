/**
 * Generates print PDFs for order items (POD/business card).
 * Uses imprint-only PDF (3.5" x 2") with just the custom text - no base/master.
 * For printer to composite with their base.
 */

const { generateImprintOnlyPdf } = require("./podPdf.service");
const { businessCardTemplate } = require("../podTemplates");

/**
 * Generate the print PDF buffer for an order item with printData.
 * Returns 3.5" x 2" imprint-only PDF (no base background).
 * @param {Object} item - OrderItem with printData (JSON string)
 * @returns {Promise<Buffer|null>} PDF buffer or null if no print data
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

  return generateImprintOnlyPdf(userData, businessCardTemplate);
}

module.exports = {
  generatePrintPdfForItem,
};
