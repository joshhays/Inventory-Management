// POD templates for print-on-demand PDFs.
// Coordinates are specified in inches from the top-left of the page (MediaBox).

// Knockout 49 = name, title, role. Knockout 30 = everything else.
const FONT_KNOCKOUT_49 = "Knockout-49.ttf";
const FONT_KNOCKOUT_30 = "Knockout-30.ttf";

/** Bottom of PGIM logo artwork from top of page — calibrate to match business-card-base.pdf if needed. */
const PGIM_LOGO_BOTTOM_INCHES = 0.55;
/** Name (first line) baseline sits this far below the logo bottom. */
const INCHES_BELOW_LOGO_FOR_NAME = 0.21;
/** Previous template steps (keeps title/role rhythm under the name line). */
const STEP_NAME_TO_TITLE_IN = 1.05 - 0.8655;
const STEP_TITLE_TO_ROLE_IN = 1.195 - 1.05;

const Y_NAME = PGIM_LOGO_BOTTOM_INCHES + INCHES_BELOW_LOGO_FOR_NAME;
const Y_TITLE = Y_NAME + STEP_NAME_TO_TITLE_IN;
const Y_ROLE = Y_TITLE + STEP_TITLE_TO_ROLE_IN;

/** Even spacing in contact stack (match phone → address gap). */
const Y_EMAIL = 1.525;
const Y_PHONE = 1.655;
const Y_ADDRESS = 1.78;
const CONTACT_LINE_STEP_IN = Y_ADDRESS - Y_PHONE;
const Y_WEBSITE = Y_ADDRESS + CONTACT_LINE_STEP_IN;

const businessCardTemplate = {
  fields: [
    // Name – Knockout 49, Pantone 300 C as DeviceCMYK (not RGB — avoids wrong RIP conversion)
    {
      key: "name",
      page: 0,
      xInches: 0.3474,
      yInches: Y_NAME,
      fontSize: 14,
      maxWidthInches: 1.7,
      cmyk: [1, 0.44, 0, 0],
      pantone: "300C",
      color: "#005EB8",
      fontFile: FONT_KNOCKOUT_49,
    },
    {
      key: "title",
      page: 0,
      xInches: 0.3474,
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
      xInches: 0.3474,
      yInches: Y_ROLE,
      fontSize: 9,
      maxWidthInches: 1.7,
      cmyk: [0, 0, 0, 1],
      color: "#000000",
      fontFile: FONT_KNOCKOUT_49,
    },
    // Contact block + disclosure – Knockout 30
    {
      key: "email",
      page: 0,
      xInches: 0.3474,
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
      xInches: 0.3474,
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
      xInches: 0.3474,
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
      xInches: 0.3474,
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
      xInches: 0.4416,
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

