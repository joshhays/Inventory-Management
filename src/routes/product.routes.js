const express = require("express");
const productController = require("../controllers/product.controller");
const productFileController = require("../controllers/productFile.controller");
const upload = require("../middleware/upload");
const uploadCsv = require("../middleware/uploadCsv");

const router = express.Router();

router.get("/", productController.getProducts);
router.get("/export/csv", productController.exportCsv);
router.post("/import", (req, res, next) => {
  uploadCsv(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed." });
    next();
  });
}, productController.importCsv);
router.post("/", productController.createProduct);
router.patch("/:id", productController.updateQuantity);
router.put("/:id", productController.updateProduct);

router.get("/:id/label", productController.getLabel);
router.get("/:id/files", productFileController.getFiles);
router.post("/:id/files", (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed." });
    next();
  });
}, productFileController.uploadFile);
router.delete("/:id/files/:fileId", productFileController.deleteFile);

module.exports = router;
