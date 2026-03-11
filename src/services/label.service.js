const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");

// Standard barcode label: 2" x 1" (Avery 8160, etc.)
const WIDTH_PT = 2 * 72;
const HEIGHT_PT = 1 * 72;
const MARGIN = 4;

async function generateLabel(product) {
  const barcodePng = await bwipjs.toBuffer({
    bcid: "code128",
    text: product.sku,
    scale: 1.5,
    height: 6,
    includetext: false,
  });

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: [WIDTH_PT, HEIGHT_PT],
      margin: 0,
      autoFirstPage: false,
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.addPage({ size: [WIDTH_PT, HEIGHT_PT], margin: 0 });

    const barcodeW = Math.min(WIDTH_PT - MARGIN * 2, 120);
    const barcodeH = 18;
    const totalH = barcodeH + 4 + 8 + 2 + 6;
    let y = (HEIGHT_PT - totalH) / 2;

    const barcodeX = (WIDTH_PT - barcodeW) / 2;
    doc.image(barcodePng, barcodeX, y, { width: barcodeW, height: barcodeH });
    y += barcodeH + 4;

    doc.fontSize(7).font("Helvetica-Bold").text(product.sku, 0, y, {
      width: WIDTH_PT,
      align: "center",
    });
    y += 10;

    const desc = (product.description || product.name || "").slice(0, 40);
    doc.fontSize(5).font("Helvetica").text(desc, 0, y, {
      width: WIDTH_PT,
      align: "center",
      lineBreak: false,
      ellipsis: true,
    });

    doc.end();
  });
}

module.exports = { generateLabel };
