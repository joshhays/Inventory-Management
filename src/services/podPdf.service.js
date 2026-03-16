const path = require("path");
const fs = require("fs");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const FONTS_DIR = path.resolve(__dirname, "../../fonts");

/**
 * Load and embed a custom font from the fonts folder, or fall back to Helvetica.
 * @param {PDFDocument} pdfDoc
 * @param {string} [fontFile] - Filename in fonts folder (e.g. "ITCGaramondStd-BkCond.otf"). If omitted, uses Helvetica.
 * @returns {Promise<PDFFont>}
 */
async function getFont(pdfDoc, fontFile) {
  if (!fontFile || typeof fontFile !== "string") {
    return pdfDoc.embedFont(StandardFonts.Helvetica);
  }
  const fontPath = path.join(FONTS_DIR, fontFile.trim());
  if (!path.resolve(fontPath).startsWith(FONTS_DIR) || !fs.existsSync(fontPath)) {
    return pdfDoc.embedFont(StandardFonts.Helvetica);
  }
  try {
    const bytes = fs.readFileSync(fontPath);
    return pdfDoc.embedFont(bytes);
  } catch {
    return pdfDoc.embedFont(StandardFonts.Helvetica);
  }
}

/**
 * Example templateConfig:
 * {
 *   fields: [
 *     {
 *       key: "name",
 *       page: 0,
 *       xInches: 0.5,
 *       yInches: 1.0,
 *       fontSize: 14,
 *       color: "#111827",
 *       maxWidthInches: 2    // copyfitting width for name
 *     },
 *     { key: "title",  page: 0, xInches: 0.5, yInches: 1.3, fontSize: 10, color: "#4b5563" },
 *     {
 *       key: "company",
 *       page: 0,
 *       xInches: 0.5,
 *       yInches: 1.6,
 *       fontSize: 10,
 *       color: "#4b5563"
 *       // vertical stacking is handled in code: if 'title' is empty, this line is moved up by 12pt
 *     },
 *     { key: "email",  page: 0, xInches: 0.5, yInches: 1.9, fontSize: 9,  color: "#6b7280" }
 *   ]
 * }
 */

/**
 * Generate a personalized business card PDF from a base PDF.
 *
 * @param {Uint8Array|Buffer} basePdfBytes - The base (template) PDF contents.
 * @param {Object} userData - e.g. { name: "Jane Doe", title: "Manager", email: "jane@acme.com" }
 * @param {Object} templateConfig - JSON describing where to place each field.
 * @returns {Promise<Buffer>} - The modified PDF bytes as a Node Buffer.
 */
async function generateBusinessCardPdf(basePdfBytes, userData, templateConfig) {
  const pdfDoc = await PDFDocument.load(basePdfBytes);
  pdfDoc.registerFontkit(fontkit);

  // Cache fonts by filename so we can use multiple fonts per document (e.g. Knockout 49 vs 30).
  const fontCache = new Map();
  const defaultFontFile = templateConfig?.fontFile;
  async function fontForField(fieldFontFile) {
    const file = fieldFontFile || defaultFontFile;
    if (!fontCache.has(file)) {
      fontCache.set(file, await getFont(pdfDoc, file));
    }
    return fontCache.get(file);
  }

  const fields = Array.isArray(templateConfig?.fields) ? templateConfig.fields : [];

  const drawCommands = [];

  for (const field of fields) {
    const key = field.key;
    if (!key) continue;

    const rawValue = userData[key];
    // Suppression: if the data is empty, draw nothing (including any implied label/prefix)
    if (rawValue == null || String(rawValue).trim() === "") continue;
    const text = String(rawValue).trim();

    const pageIndex = typeof field.page === "number" ? field.page : 0;
    const page = pdfDoc.getPage(pageIndex);
    if (!page) continue;

    const font = await fontForField(field.fontFile);

    const { height } = page.getSize();

    // Coordinates are inches from top-left; convert to PDF points.
    const xIn = Number(field.xInches || 0);
    const yIn = Number(field.yInches || 0);
    const x = xIn * 72;
    const yFromTop = yIn * 72;
    let y = height - yFromTop; // pdf-lib origin is bottom-left

    // Vertical stacking: if title is empty, move company line up by 12pt (no gap)
    if (key === "company") {
      const titleValue = userData.title;
      if (titleValue == null || String(titleValue).trim() === "") {
        y += 12; // 12 points closer to the top
      }
    }

    let fontSize = Number(field.fontSize || 10);

    let color = rgb(0, 0, 0);
    if (typeof field.color === "string") {
      const hex = field.color.replace("#", "");
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
          color = rgb(r, g, b);
        }
      }
    }

    // Copyfitting: if maxWidthInches is provided, shrink font size so text fits (single-line fields)
    const maxWidthInches = typeof field.maxWidthInches === "number" ? field.maxWidthInches : null;
    let wrapWidthPts = null;
    if (key === "disclosure" && maxWidthInches && maxWidthInches > 0) {
      wrapWidthPts = maxWidthInches * 72;
    } else if (maxWidthInches && maxWidthInches > 0 && !text.includes("\n")) {
      const maxWidthPts = maxWidthInches * 72;
      const widthAtSize = font.widthOfTextAtSize(text, fontSize);
      if (widthAtSize > maxWidthPts) {
        const scale = maxWidthPts / widthAtSize;
        const minFontSize = field.minFontSize ? Number(field.minFontSize) || 6 : 6;
        fontSize = Math.max(minFontSize, Math.floor(fontSize * scale));
      }
    }

    const lineHeight = fontSize * 1.2;
    const lines = text.split(/\r?\n/).filter((s) => s.length > 0);
    if (lines.length === 0) continue;
    if (lines.length === 1 && !wrapWidthPts) {
      drawCommands.push({ key, pageIndex, text: lines[0], x, y, fontSize, color, wrapWidthPts, font });
    } else if (lines.length > 1) {
      lines.forEach((line, i) => {
        drawCommands.push({
          key,
          pageIndex,
          text: line,
          x,
          y: y - i * lineHeight,
          fontSize,
          color,
          wrapWidthPts: null,
          font,
        });
      });
    } else {
      drawCommands.push({ key, pageIndex, text: lines[0], x, y, fontSize, color, wrapWidthPts, font });
    }
  }

  // Normalize font size across contact block (email, phoneP, phoneM, address, website)
  const groupKeys = new Set(["email", "phoneP", "phoneM", "address", "website"]);
  let groupMinSize = null;
  for (const cmd of drawCommands) {
    if (groupKeys.has(cmd.key)) {
      if (groupMinSize === null || cmd.fontSize < groupMinSize) {
        groupMinSize = cmd.fontSize;
      }
    }
  }

  for (const cmd of drawCommands) {
    const page = pdfDoc.getPage(cmd.pageIndex);
    if (!page) continue;
    let size = cmd.fontSize;
    if (groupMinSize && groupKeys.has(cmd.key)) {
      size = groupMinSize;
    }
    const drawOpts = {
      x: cmd.x,
      y: cmd.y,
      size,
      font: cmd.font,
      color: cmd.color,
    };
    if (cmd.wrapWidthPts) {
      drawOpts.maxWidth = cmd.wrapWidthPts;
      drawOpts.lineHeight = size * 1.2;
    }
    page.drawText(cmd.text, drawOpts);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  generateBusinessCardPdf,
};

