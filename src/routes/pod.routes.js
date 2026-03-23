const express = require("express");
const fs = require("fs");
const path = require("path");
const { generateBusinessCardPdf, cropPdfToTrim } = require("../services/podPdf.service");
const { businessCardTemplate } = require("../podTemplates");

const router = express.Router();

// POST /api/pod/preview
// Body: { name, title, role, email, phoneP, phoneM, address, website, ... }
router.post("/preview", async (req, res, next) => {
  try {
    const userData = req.body || {};
    const basePdfPath = path.join(__dirname, "../../product-files/business-card-base.pdf");

    if (!fs.existsSync(basePdfPath)) {
      return res.status(503).json({
        message: "Preview not configured. Add business-card-base.pdf to the product-files folder.",
      });
    }

    const basePdfBytes = fs.readFileSync(basePdfPath);
    const pdfBuffer = await generateBusinessCardPdf(basePdfBytes, userData, businessCardTemplate);
    const cropped = await cropPdfToTrim(pdfBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.send(cropped);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

