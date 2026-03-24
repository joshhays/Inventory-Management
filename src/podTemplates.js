// POD templates for print-on-demand PDFs.
// Coordinates are specified in inches from the top-left of the page (MediaBox).

// Knockout 49 = name, title, role. Knockout 30 = everything else.
const FONT_KNOCKOUT_49 = "Knockout-49.ttf";
const FONT_KNOCKOUT_30 = "Knockout-30.ttf";

/** Name baseline from top of MediaBox (inches). */
const Y_NAME = 0.9456;
/** Keep title/role vertical rhythm from legacy template. */
const STEP_NAME_TO_TITLE_IN = 1.05 - 0.8655;
const STEP_TITLE_TO_ROLE_IN = 1.195 - 1.05;
const Y_TITLE = Y_NAME + STEP_NAME_TO_TITLE_IN;
const Y_ROLE = Y_TITLE + STEP_TITLE_TO_ROLE_IN;

/**
 * Clear gap between bottom of one contact line and top of the next ≈ 0.05".
 * Baseline step = gap + line band (ascender/descender) for 9pt Knockout — prior
 * desc/asc estimates were too large and read as ~0.1" clear instead of 0.05".
 */
const CONTACT_STACK_CLEAR_IN = 0.05;
const CONTACT_9PT_LINE_BAND_IN = 0.08;
const CONTACT_BASELINE_STEP_IN = CONTACT_STACK_CLEAR_IN + CONTACT_9PT_LINE_BAND_IN;

const Y_EMAIL = 1.525;
const Y_PHONE = Y_EMAIL + CONTACT_BASELINE_STEP_IN;
const Y_ADDRESS = Y_PHONE + CONTACT_BASELINE_STEP_IN;
const Y_WEBSITE = Y_ADDRESS + CONTACT_BASELINE_STEP_IN;

/** Front-card body text x origin (disclosure back matches). */
const BODY_TEXT_X_INCHES = 0.3474;

const businessCardTemplate = {
  fields: [
    // Name – Knockout 49, PANTONE 300 C as PDF Separation (see podPdf.service.js)
    {
      key: "name",
      page: 0,
      xInches: BODY_TEXT_X_INCHES,
      yInches: Y_NAME,
      fontSize: 14,
      maxWidthInches: 1.7,
      pantone: "300C",
      color: "#005EB8",
      fontFile: FONT_KNOCKOUT_49,
    },
    {
      key: "title",
      page: 0,
      xInches: BODY_TEXT_X_INCHES,
      yInches: Y_TITLE,
      fontSize: 10,
      maxWidthInches: 1.7,
      cmyk: [0, 0, 0, 1],
      color: "#000000",
      fontFile: FONT_KNOCKOUT_49,
    },
    {
      key: "role",
      page: 0,
      xInches: BODY_TEXT_X_INCHES,
      yInches: Y_ROLE,
      fontSize: 9,
      maxWidthInches: 1.7,
      cmyk: [0, 0, 0, 1],
      color: "#000000",
      fontFile: FONT_KNOCKOUT_49,
    },
    {
      key: "email",
      page: 0,
      xInches: BODY_TEXT_X_INCHES,
      yInches: Y_EMAIL,
      fontSize: 9,
      maxWidthInches: 1.7,
      cmyk: [0, 0, 0, 1],
      color: "#000000",
      fontFile: FONT_KNOCKOUT_30,
    },
    {
      key: "phone",
      page: 0,
      xInches: BODY_TEXT_X_INCHES,
      yInches: Y_PHONE,
      fontSize: 9,
      maxWidthInches: 1.7,
      cmyk: [0, 0, 0, 1],
      color: "#000000",
      fontFile: FONT_KNOCKOUT_30,
    },
    {
      key: "address",
      page: 0,
      xInches: BODY_TEXT_X_INCHES,
      yInches: Y_ADDRESS,
      fontSize: 9,
      maxWidthInches: 1.7,
      cmyk: [0, 0, 0, 1],
      color: "#000000",
      fontFile: FONT_KNOCKOUT_30,
    },
    {
      key: "website",
      page: 0,
      xInches: BODY_TEXT_X_INCHES,
      yInches: Y_WEBSITE,
      fontSize: 9,
      maxWidthInches: 1.7,
      cmyk: [0, 0, 0, 1],
      color: "#000000",
      fontFile: FONT_KNOCKOUT_30,
    },
    {
      key: "disclosure",
      page: 1,
      xInches: BODY_TEXT_X_INCHES,
      yInches: 0.3474,
      fontSize: 7,
      maxWidthInches: 3.15,
      cmyk: [0, 0, 0, 1],
      color: "#000000",
      fontFile: FONT_KNOCKOUT_30,
    },
  ],
};

module.exports = {
  businessCardTemplate,
};
