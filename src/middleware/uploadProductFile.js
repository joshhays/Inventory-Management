const path = require("path");
const multer = require("multer");

const storage = multer.memoryStorage();
const allowedExt = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"];

module.exports = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase();
    if (allowedExt.includes(ext)) cb(null, true);
    else cb(new Error("Only PDF and image files (jpg, png, gif, webp) are allowed."));
  },
}).single("file");
