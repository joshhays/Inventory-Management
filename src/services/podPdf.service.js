const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Generate a POD proof/production PDF buffer from template + data.
// For now we support "business_card" and "generic_list".
function generatePodPdfBuffer(product, templateConfig, printData = {}) {
  const cfg = templateConfig || {};
  const layout = (cfg.layout || "business_card").toLowerCase();
  const fields = Array.isArray(cfg.fields) ? cfg.fields : [];

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: layout === "business_card" ? [3.5 * 72, 2 * 72] : "LETTER",
      margin: layout === "business_card" ? 24 : 50,
    });

    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (layout === "business_card") {
      renderBusinessCard(doc, product, fields, printData);
    } else {
      renderGenericList(doc, product, fields, printData);
    }

    doc.end();
  });
}

function renderBusinessCard(doc, product, fields, printData) {
  const width = doc.page.width;
  const height = doc.page.height;

  // simple background band
  doc.rect(0, 0, width, height).fill("#ffffff");
  doc.rect(0, 0, width, 18).fill("#111827");
  doc.fill("#ffffff").fontSize(9).font("Helvetica-Bold").text(product.name || "Business Card", 10, 4, {
    width: width - 20,
    align: "left",
  });

  const valueFor = (key, fallback) => {
    const v = printData[key];
    return typeof v === "string" && v.trim() ? v.trim() : fallback;
  };

  const name = valueFor("name", "Your Name");
  const title = valueFor("title", "");
  const company = valueFor("company", "");
  const phone = valueFor("phone", "");
  const email = valueFor("email", "");

  let y = 32;
  doc.fill("#111827").fontSize(14).font("Helvetica-Bold").text(name, 20, y, { width: width - 40 });
  y += 18;

  if (title) {
    doc.fontSize(10).font("Helvetica").fill("#4b5563").text(title, 20, y, { width: width - 40 });
    y += 14;
  }
  if (company) {
    doc.fontSize(9).font("Helvetica").fill("#6b7280").text(company, 20, y, { width: width - 40 });
    y += 13;
  }

  const contactParts = [];
  if (phone) contactParts.push(phone);
  if (email) contactParts.push(email);
  if (contactParts.length) {
    doc.fontSize(8).font("Helvetica").fill("#6b7280").text(contactParts.join("  ·  "), 20, height - 26, {
      width: width - 40,
      align: "left",
    });
  }
}

function renderGenericList(doc, product, fields, printData) {
  const title = product.name || "Print item";
  doc.fontSize(18).font("Helvetica-Bold").fill("#111827").text(title, { align: "left" });
  doc.moveDown(0.5);
  if (product.description) {
    doc.fontSize(11).font("Helvetica").fill("#4b5563").text(product.description, { align: "left" });
    doc.moveDown(0.75);
  }

  const valueFor = (key) => {
    const v = printData[key];
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  };

  doc.moveDown(0.5);
  fields.forEach((f) => {
    const key = f.key;
    if (!key) return;
    const label = f.label || key;
    const val = valueFor(key) || "—";
    doc.fontSize(10).font("Helvetica-Bold").fill("#111827").text(label + ":", { continued: true });
    doc.fontSize(10).font("Helvetica").fill("#111827").text(" " + val);
  });
}

async function writePodPdfToDisk(product, templateConfig, printData, orderId, orderItemId) {
  const buffer = await generatePodPdfBuffer(product, templateConfig, printData);
  const baseDir = path.resolve(__dirname, "../../uploads/pod-orders");
  await fs.promises.mkdir(baseDir, { recursive: true });
  const filename = `order-${orderId}-item-${orderItemId}.pdf`;
  const abs = path.join(baseDir, filename);
  await fs.promises.writeFile(abs, buffer);
  // We store path relative to /uploads
  return path.posix.join("pod-orders", filename);
}

module.exports = {
  generatePodPdfBuffer,
  writePodPdfToDisk,
};

