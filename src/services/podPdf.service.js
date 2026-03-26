const path = require("path");
const fs = require("fs");
const { PDFDocument, StandardFonts, rgb, cmyk, PDFName, PDFNumber } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const strings = require("pdf-lib/cjs/utils/strings");
const { degrees, toRadians } = require("pdf-lib/cjs/api/rotations");
const pdfOps = require("pdf-lib/cjs/api/operators");
const { PDFOperator, PDFOperatorNames, PDFDict } = require("pdf-lib/cjs/core");

const FONTS_DIR = path.resolve(__dirname, "../../fonts");

const TRIM_WIDTH_PT = 3.5 * 72;
const TRIM_HEIGHT_PT = 2 * 72;

/** Business card copyfitting: max sizes (pt); title + role share one size after fitting. */
const MAX_NAME_FONT_PT = 12;
const MAX_TITLE_ROLE_FONT_PT = 9;

/**
 * After per-field copyfitting, set title and role to the same font size (min of both lines).
 */
function normalizeTitleRoleFontSizes(drawCommands) {
  const titleCmds = drawCommands.filter((c) => c.key === "title");
  const roleCmds = drawCommands.filter((c) => c.key === "role");
  if (titleCmds.length === 0 || roleCmds.length === 0) return;
  if (titleCmds[0].pageIndex !== roleCmds[0].pageIndex) return;
  const titleMin = Math.min(...titleCmds.map((c) => c.fontSize));
  const roleMin = Math.min(...roleCmds.map((c) => c.fontSize));
  const unified = Math.min(titleMin, roleMin);
  titleCmds.forEach((c) => {
    c.fontSize = unified;
  });
  roleCmds.forEach((c) => {
    c.fontSize = unified;
  });
}

/** Inset from each page edge when setting CropBox (standard 1/8" bleed trim). */
const CROP_INSET_INCHES = 0.125;
const CROP_INSET_PT = CROP_INSET_INCHES * 72;

/** Resource name for [/Separation /PANTONE#20300#20C /DeviceCMYK …] on each page. */
const PMS_RESOURCE_NAME = "Pms300c";

/** Marker: draw with PDF Separation “PANTONE 300 C” (alternate CMYK 100/44/0/0 at full tint). */
const FILL_SPOT_PANTONE_300 = Object.freeze({ type: "SPOT_PANTONE_300" });

/**
 * Pantone 300 C fallback as DeviceCMYK (e.g. when forceDeviceCmyk or non–pdf-lib spot path).
 */
const CMYK_PANTONE_300_C = () => cmyk(1, 0.44, 0, 0);

/** 100% black only (no rich black). */
const CMYK_BLACK = () => cmyk(0, 0, 0, 1);

function isFillSpotPantone300(color) {
  return Boolean(color && typeof color === "object" && color.type === "SPOT_PANTONE_300");
}

function wantsPantone300Spot(field) {
  if (field.forceDeviceCmyk === true) return false;
  const spot = field.spot || field.pantone;
  if (spot === "PANTONE_300_C" || spot === "300C" || spot === "300 C") return true;
  const k = field.key;
  if (k === "name" || k === "firstName" || k === "lastName") return true;
  if (typeof field.color === "string") {
    let hex = field.color.replace(/^#/, "").trim().toLowerCase();
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex === "005eb8") return true;
  }
  return false;
}

/**
 * Resolve fill color for POD fields. Name / PMS blue uses Separation spot unless forceDeviceCmyk.
 * @param {Object} field - Template field (key, color, cmyk, pantone, spot, forceDeviceCmyk)
 */
function templateFieldColor(field) {
  if (wantsPantone300Spot(field)) {
    return FILL_SPOT_PANTONE_300;
  }
  if (field.cmyk && Array.isArray(field.cmyk) && field.cmyk.length === 4) {
    let [cc, mm, yy, kk] = field.cmyk.map((v) => Number(v));
    if (![cc, mm, yy, kk].some((n) => Number.isNaN(n))) {
      const maxComp = Math.max(cc, mm, yy, kk);
      if (maxComp > 1) {
        cc /= 100;
        mm /= 100;
        yy /= 100;
        kk /= 100;
      }
      return cmyk(
        Math.min(1, Math.max(0, cc)),
        Math.min(1, Math.max(0, mm)),
        Math.min(1, Math.max(0, yy)),
        Math.min(1, Math.max(0, kk)),
      );
    }
  }
  if (typeof field.color === "string") {
    let hex = field.color.replace(/^#/, "").trim().toLowerCase();
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex === "000000") return CMYK_BLACK();
    if (hex === "005eb8") return CMYK_PANTONE_300_C();
  }
  if (typeof field.color === "string") {
    const h = field.color.replace("#", "");
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16) / 255;
      const g = parseInt(h.slice(2, 4), 16) / 255;
      const b = parseInt(h.slice(4, 6), 16) / 255;
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return rgb(r, g, b);
    }
  }
  return CMYK_BLACK();
}

/**
 * Register PANTONE 300 C as a Separation color space (alternate DeviceCMYK).
 * @returns {string} Resource name for cs operator
 */
function ensurePantone300Separation(pdfDoc, page) {
  const ctx = pdfDoc.context;
  const leaf = page.node;
  let resourcesRef = leaf.get(PDFName.of("Resources"));
  let resourcesDict;
  if (!resourcesRef) {
    resourcesDict = PDFDict.withContext(ctx);
    resourcesRef = ctx.register(resourcesDict);
    leaf.set(PDFName.of("Resources"), resourcesRef);
  } else {
    resourcesDict = ctx.lookup(resourcesRef, PDFDict);
  }

  const csEntry = resourcesDict.get(PDFName.of("ColorSpace"));
  let colorSpaceDict =
    csEntry != null ? ctx.lookup(csEntry, PDFDict) : undefined;
  if (!colorSpaceDict) {
    colorSpaceDict = PDFDict.withContext(ctx);
    resourcesDict.set(PDFName.of("ColorSpace"), colorSpaceDict);
  }

  if (colorSpaceDict.has(PDFName.of(PMS_RESOURCE_NAME))) {
    return PMS_RESOURCE_NAME;
  }

  const fnDict = ctx.obj({
    FunctionType: 2,
    Domain: [0, 1],
    C0: [0, 0, 0, 0],
    C1: [1, 0.44, 0, 0],
    N: 1,
  });
  const fnRef = ctx.register(fnDict);
  const sepArray = ctx.obj([
    "Separation",
    PDFName.of("PANTONE#20300#20C"),
    PDFName.of("DeviceCMYK"),
    fnRef,
  ]);
  const sepRef = ctx.register(sepArray);
  colorSpaceDict.set(PDFName.of(PMS_RESOURCE_NAME), sepRef);
  return PMS_RESOURCE_NAME;
}

function buildDrawLinesOfTextSpotOperators(encodedLines, options) {
  const ops = [
    pdfOps.pushGraphicsState(),
    options.graphicsState && pdfOps.setGraphicsState(options.graphicsState),
    pdfOps.beginText(),
    PDFOperator.of(PDFOperatorNames.NonStrokingColorspace, [PDFName.of(options.spotResourceName)]),
    // Separation / DeviceN require scn, not sc (PDF Reference Table 74).
    PDFOperator.of(PDFOperatorNames.NonStrokingColorN, [PDFNumber.of(options.tint != null ? options.tint : 1)]),
    pdfOps.setFontAndSize(options.font, options.size),
    pdfOps.setLineHeight(options.lineHeight),
    pdfOps.rotateAndSkewTextRadiansAndTranslate(
      toRadians(options.rotate),
      toRadians(options.xSkew),
      toRadians(options.ySkew),
      options.x,
      options.y,
    ),
  ].filter(Boolean);
  for (let i = 0; i < encodedLines.length; i++) {
    ops.push(pdfOps.showText(encodedLines[i]), pdfOps.nextLine());
  }
  ops.push(pdfOps.endText(), pdfOps.popGraphicsState());
  return ops;
}

/**
 * Draw text in PANTONE 300 C Separation (full tint). Restores page font after.
 */
function pushSpotPantone300Text(page, pdfDoc, cmd) {
  const prevFont = page.font;
  const prevKey = page.fontKey;
  try {
    ensurePantone300Separation(pdfDoc, page);
    page.setFont(cmd.font);
    const fontKey = page.fontKey;
    const size = cmd.fontSize;
    const lineHeight = size * 1.2;
    let encodedLines;
    if (cmd.wrapWidthPts) {
      const lines = strings.breakTextIntoLines(
        cmd.text,
        page.doc.defaultWordBreaks,
        cmd.wrapWidthPts,
        (t) => cmd.font.widthOfTextAtSize(t, size),
      );
      encodedLines = lines.map((line) => cmd.font.encodeText(line));
    } else {
      const parts = strings.lineSplit(strings.cleanText(cmd.text)).filter((s) => s.length > 0);
      encodedLines = parts.map((line) => cmd.font.encodeText(line));
    }
    const ops = buildDrawLinesOfTextSpotOperators(encodedLines, {
      spotResourceName: PMS_RESOURCE_NAME,
      font: fontKey,
      size,
      rotate: degrees(0),
      xSkew: degrees(0),
      ySkew: degrees(0),
      x: cmd.x,
      y: cmd.y,
      lineHeight,
      tint: 1,
    });
    page.getContentStream().push(...ops);
  } finally {
    if (prevFont) page.setFont(prevFont);
    else page.resetFont();
  }
}

/**
 * Trim rectangle for a page: MediaBox inset by CROP_INSET_PT on each side.
 * Uses full MediaBox (x, y, width, height). Coordinates match pdf-lib setCropBox(x, y, width, height)
 * — not upper-right corners.
 * @returns {{ mediaX: number, mediaY: number, mediaW: number, mediaH: number, llx: number, lly: number, trimW: number, trimH: number }}
 */
function getTrimRectForPage(page) {
  const m = page.getMediaBox();
  const innerW = m.width - 2 * CROP_INSET_PT;
  const innerH = m.height - 2 * CROP_INSET_PT;
  if (innerW <= 0 || innerH <= 0) {
    return {
      mediaX: m.x,
      mediaY: m.y,
      mediaW: m.width,
      mediaH: m.height,
      llx: m.x,
      lly: m.y,
      trimW: m.width,
      trimH: m.height,
    };
  }
  return {
    mediaX: m.x,
    mediaY: m.y,
    mediaW: m.width,
    mediaH: m.height,
    llx: m.x + CROP_INSET_PT,
    lly: m.y + CROP_INSET_PT,
    trimW: innerW,
    trimH: innerH,
  };
}

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

  function formatPhoneForCard(val) {
    const digits = String(val || "").replace(/\D/g, "");
    if (digits.length < 10) return null;
    const last10 = digits.slice(-10);
    return "+1 " + last10.slice(0, 3) + " " + last10.slice(3, 6) + " " + last10.slice(6);
  }

  function buildPhoneDisplay(userData) {
    const p = formatPhoneForCard(userData.phoneP);
    const m = formatPhoneForCard(userData.phoneM);
    const parts = [];
    if (p) parts.push("P " + p);
    if (m) parts.push("M " + m);
    if (parts.length === 0) return null;
    return parts.join("  |  ");
  }

  const drawCommands = [];

  for (const field of fields) {
    const key = field.key;
    if (!key) continue;

    let rawValue = userData[key];
    if (key === "phone") {
      rawValue = buildPhoneDisplay(userData);
      if ((rawValue == null || String(rawValue).trim() === "") && userData.phone) {
        rawValue = String(userData.phone).trim();
      }
    }
    // Suppression: if the data is empty, draw nothing (including any implied label/prefix)
    if (rawValue == null || String(rawValue).trim() === "") continue;
    const text = String(rawValue).trim();

    const pageIndex = typeof field.page === "number" ? field.page : 0;
    const page = pdfDoc.getPage(pageIndex);
    if (!page) continue;

    const font = await fontForField(field.fontFile);

    const media = page.getMediaBox();

    // Coordinates are inches from top-left of MediaBox; convert to PDF points (origin bottom-left).
    const xIn = Number(field.xInches || 0);
    const yIn = Number(field.yInches || 0);
    const x = media.x + xIn * 72;
    const yFromTop = yIn * 72;
    let y = media.y + media.height - yFromTop;

    // Vertical stacking: if title is empty, move company line up by 12pt (no gap)
    if (key === "company") {
      const titleValue = userData.title;
      if (titleValue == null || String(titleValue).trim() === "") {
        y += 12; // 12 points closer to the top
      }
    }

    let fontSize = Number(field.fontSize || 10);
    if (key === "name") {
      fontSize = Math.min(MAX_NAME_FONT_PT, fontSize);
    } else if (key === "title" || key === "role") {
      fontSize = Math.min(MAX_TITLE_ROLE_FONT_PT, fontSize);
    }

    const color = templateFieldColor(field);

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

    if (key === "name") {
      fontSize = Math.min(MAX_NAME_FONT_PT, fontSize);
    } else if (key === "title" || key === "role") {
      fontSize = Math.min(MAX_TITLE_ROLE_FONT_PT, fontSize);
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

  normalizeTitleRoleFontSizes(drawCommands);

  // Normalize font size across contact block (email, phone, address, website)
  const groupKeys = new Set(["email", "phone", "address", "website"]);
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
    if (isFillSpotPantone300(cmd.color)) {
      pushSpotPantone300Text(page, pdfDoc, { ...cmd, fontSize: size });
      continue;
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

/**
 * Crop a PDF by setting CropBox inset 0.125" from MediaBox on each side (e.g. 3.75×2.25" → 3.5×2").
 * Uses pdf-lib setCropBox(x, y, width, height) with trim width/height = media − 2×inset.
 * @param {Uint8Array|Buffer} pdfBytes
 * @returns {Promise<Buffer>}
 */
async function cropPdfToTrim(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { llx, lly, trimW, trimH } = getTrimRectForPage(page);
    if (trimW > 0 && trimH > 0) {
      page.setCropBox(llx, lly, trimW, trimH);
    }
  }
  const out = await pdfDoc.save();
  return Buffer.from(out);
}

/**
 * Generate imprint-only PDF: 3.5" x 2" pages with only the text content (no base/master background).
 * Field coordinates match generateBusinessCardPdf: inches from the top-left of each base PDF page.
 * When basePdfBytes is provided, positions are converted into trim space (0.125" edge crop) so text aligns
 * with the composite proof. When omitted, coordinates are assumed relative to a 3.5×2" page.
 *
 * @param {Object} userData - e.g. { name, title, role, email, phoneP, phoneM, address, website }
 * @param {Object} templateConfig - JSON describing field positions (same as generateBusinessCardPdf)
 * @param {Uint8Array|Buffer|null} [basePdfBytes] - Master PDF used for placement (optional)
 * @returns {Promise<Buffer>}
 */
async function generateImprintOnlyPdf(userData, templateConfig, basePdfBytes = null) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let basePageMetrics = null;
  if (basePdfBytes && basePdfBytes.length) {
    try {
      const baseDoc = await PDFDocument.load(basePdfBytes);
      basePageMetrics = baseDoc.getPages().map((p) => getTrimRectForPage(p));
    } catch {
      basePageMetrics = null;
    }
  }

  function metricsForPageIndex(pageIndex) {
    if (!basePageMetrics?.length) {
      return {
        mediaX: 0,
        mediaY: 0,
        mediaW: TRIM_WIDTH_PT,
        mediaH: TRIM_HEIGHT_PT,
        llx: 0,
        lly: 0,
        trimW: TRIM_WIDTH_PT,
        trimH: TRIM_HEIGHT_PT,
      };
    }
    const i = Math.min(Math.max(0, pageIndex), basePageMetrics.length - 1);
    return basePageMetrics[i];
  }

  const pageIndices = new Set((templateConfig?.fields || []).map((f) => typeof f.page === "number" ? f.page : 0));
  const maxPage = Math.max(0, ...pageIndices);
  for (let i = 0; i <= maxPage; i++) {
    const m = metricsForPageIndex(i);
    pdfDoc.addPage([m.trimW, m.trimH]);
  }

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

  function formatPhoneForCard(val) {
    const digits = String(val || "").replace(/\D/g, "");
    if (digits.length < 10) return null;
    const last10 = digits.slice(-10);
    return "+1 " + last10.slice(0, 3) + " " + last10.slice(3, 6) + " " + last10.slice(6);
  }

  function buildPhoneDisplay(ud) {
    const p = formatPhoneForCard(ud.phoneP);
    const m = formatPhoneForCard(ud.phoneM);
    const parts = [];
    if (p) parts.push("P " + p);
    if (m) parts.push("M " + m);
    if (parts.length === 0) return null;
    return parts.join("  |  ");
  }

  const drawCommands = [];

  for (const field of fields) {
    const key = field.key;
    if (!key) continue;

    let rawValue = userData[key];
    if (key === "phone") {
      rawValue = buildPhoneDisplay(userData);
      if ((rawValue == null || String(rawValue).trim() === "") && userData.phone) {
        rawValue = String(userData.phone).trim();
      }
    }
    if (rawValue == null || String(rawValue).trim() === "") continue;
    const text = String(rawValue).trim();

    const pageIndex = typeof field.page === "number" ? field.page : 0;
    if (pageIndex > maxPage) continue;

    const font = await fontForField(field.fontFile);
    const xIn = Number(field.xInches || 0);
    const yIn = Number(field.yInches || 0);
    const { mediaX, mediaY, mediaW: srcW, mediaH: srcH, llx, lly } = metricsForPageIndex(pageIndex);
    const xPdf = mediaX + xIn * 72;
    let yPdf = mediaY + srcH - yIn * 72;

    if (key === "company") {
      const titleValue = userData.title;
      if (titleValue == null || String(titleValue).trim() === "") yPdf += 12;
    }

    const x = xPdf - llx;
    const y = yPdf - lly;

    let fontSize = Number(field.fontSize || 10);
    if (key === "name") {
      fontSize = Math.min(MAX_NAME_FONT_PT, fontSize);
    } else if (key === "title" || key === "role") {
      fontSize = Math.min(MAX_TITLE_ROLE_FONT_PT, fontSize);
    }
    const color = templateFieldColor(field);

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

    if (key === "name") {
      fontSize = Math.min(MAX_NAME_FONT_PT, fontSize);
    } else if (key === "title" || key === "role") {
      fontSize = Math.min(MAX_TITLE_ROLE_FONT_PT, fontSize);
    }

    const lineHeight = fontSize * 1.2;
    const lines = text.split(/\r?\n/).filter((s) => s.length > 0);
    if (lines.length === 0) continue;
    if (lines.length === 1 && !wrapWidthPts) {
      drawCommands.push({ key, pageIndex, text: lines[0], x, y, fontSize, color, wrapWidthPts, font });
    } else if (lines.length > 1) {
      lines.forEach((line, i) => {
        drawCommands.push({ key, pageIndex, text: line, x, y: y - i * lineHeight, fontSize, color, wrapWidthPts: null, font });
      });
    } else {
      drawCommands.push({ key, pageIndex, text: lines[0], x, y, fontSize, color, wrapWidthPts, font });
    }
  }

  normalizeTitleRoleFontSizes(drawCommands);

  const groupKeys = new Set(["email", "phone", "address", "website"]);
  let groupMinSize = null;
  for (const cmd of drawCommands) {
    if (groupKeys.has(cmd.key) && (groupMinSize === null || cmd.fontSize < groupMinSize)) groupMinSize = cmd.fontSize;
  }

  for (const cmd of drawCommands) {
    const page = pdfDoc.getPage(cmd.pageIndex);
    if (!page) continue;
    let size = cmd.fontSize;
    if (groupMinSize && groupKeys.has(cmd.key)) size = groupMinSize;
    if (isFillSpotPantone300(cmd.color)) {
      pushSpotPantone300Text(page, pdfDoc, { ...cmd, fontSize: size });
      continue;
    }
    const drawOpts = { x: cmd.x, y: cmd.y, size, font: cmd.font, color: cmd.color };
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
  cropPdfToTrim,
  generateImprintOnlyPdf,
};

