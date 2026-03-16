const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "../../uploads/temp");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const fs = require("fs");
    if (!require("fs").existsSync(uploadDir)) {
      require("fs").mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${(file.originalname || "file").replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    cb(null, safe);
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || "").toLowerCase();
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"];
    if (allowed.some(e => ext.endsWith(e))) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files (jpg, png, gif, webp) are allowed."));
    }
  },
}).single("file");
