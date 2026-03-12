const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const PRODUCT_FILES_DIR = path.join(__dirname, "../../product-files");
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"];

function scanDir(dir, base = "") {
  const entries = [];
  if (!fs.existsSync(dir)) return entries;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const rel = base ? `${base}/${item.name}` : item.name;
    if (item.isDirectory()) {
      entries.push(...scanDir(path.join(dir, item.name), rel));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (ALLOWED_EXT.includes(ext)) {
        entries.push({ path: rel, filename: item.name });
      }
    }
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

router.get("/available", (_req, res) => {
  const files = scanDir(PRODUCT_FILES_DIR);
  res.json(files);
});

module.exports = router;
