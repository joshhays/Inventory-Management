const express = require("express");
const fs = require("fs");
const path = require("path");
const { generateBusinessCardPdf, cropPdfToTrim } = require("../services/podPdf.service");
const { businessCardTemplate } = require("../podTemplates");
const prisma = require("../lib/prisma");

const router = express.Router();

function phoneFormatFromPrintConfig(printTemplateConfig) {
  if (!printTemplateConfig || typeof printTemplateConfig !== "string") return "us";
  try {
    const p = JSON.parse(printTemplateConfig);
    const f = String(p.phoneFormat || "").toLowerCase();
    if (f === "mx" || f === "mexico") return "mx";
  } catch (_) {}
  return "us";
}

// POST /api/pod/preview
// Body: { name, title, role, email, phoneP, phoneM, address, website, ... }
// Optional: productId (loads phoneFormat from product) or phoneFormat: "mx"|"us" (overrides)
router.post("/preview", async (req, res, next) => {
  try {
    const raw = req.body || {};
    const productId = raw.productId != null ? Number(raw.productId) : null;
    const bodyFmt = String(raw.phoneFormat || "").toLowerCase();
    let phoneFormat = "us";
    if (bodyFmt === "mx" || bodyFmt === "mexico") {
      phoneFormat = "mx";
    } else if (bodyFmt === "us") {
      phoneFormat = "us";
    } else if (productId && !Number.isNaN(productId)) {
      const prod = await prisma.product.findUnique({
        where: { id: productId },
        select: { printTemplateConfig: true },
      });
      if (prod?.printTemplateConfig) phoneFormat = phoneFormatFromPrintConfig(prod.printTemplateConfig);
    }

    const userData = { ...raw };
    delete userData.productId;
    delete userData.phoneFormat;

    const basePdfPath = path.join(__dirname, "../../product-files/business-card-base.pdf");

    if (!fs.existsSync(basePdfPath)) {
      return res.status(503).json({
        message: "Preview not configured. Add business-card-base.pdf to the product-files folder.",
      });
    }

    const basePdfBytes = fs.readFileSync(basePdfPath);
    const templateConfig = { ...businessCardTemplate, phoneFormat };
    const pdfBuffer = await generateBusinessCardPdf(basePdfBytes, userData, templateConfig);
    const cropped = await cropPdfToTrim(pdfBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.send(cropped);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

