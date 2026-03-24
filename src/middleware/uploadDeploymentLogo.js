const path = require("path");
const multer = require("multer");

// Use memoryStorage so controller can upload to Wasabi when configured, or write to disk when not
const storage = multer.memoryStorage();

module.exports = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase();
    const allowed = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only image files (jpg, png, gif, webp) are allowed."));
  },
}).single("logo");
