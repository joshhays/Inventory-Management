const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "../../uploads/temp");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const fs = require("fs");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${(file.originalname || "import").replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    cb(null, safe);
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || "").toLowerCase();
    if (name.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed."));
    }
  },
}).single("file");
