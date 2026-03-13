const express = require("express");
const fs = require("fs");
const path = require("path");
const { generateBusinessCardPdf } = require("../services/podPdf.service");
const { businessCardTemplate } = require("../podTemplates");

const router = express.Router();

// POST /api/pod/preview
// Body: { name, title, role, email, phone, address, website }
router.post("/preview", async (req, res, next) => {
  try {
    const userData = req.body || {};

    const basePdfPath = path.join(__dirname, "../../product-files/business-card-base.pdf");
    const basePdfBytes = fs.readFileSync(basePdfPath);

    const pdfBuffer = await generateBusinessCardPdf(basePdfBytes, userData, businessCardTemplate);

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

