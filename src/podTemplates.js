// POD templates for print-on-demand PDFs.
// Coordinates are specified in inches from the top-left of the page.

// Knockout 49 = first name, last name, title, role. Knockout 30 = everything else.
const FONT_KNOCKOUT_49 = "Knockout-49.ttf";
const FONT_KNOCKOUT_30 = "Knockout-30.ttf";

const businessCardTemplate = {
  fields: [
    // Name – Knockout 49, Pantone 300 Blue
    {
      key: "name",
      page: 0,
      xInches: 0.3474,
      yInches: 0.8655,
      fontSize: 14,
      maxWidthInches: 1.7,
      color: "#005EB8", // Pantone 300 C
      fontFile: FONT_KNOCKOUT_49,
    },
    {
      key: "title",
      page: 0,
      xInches: 0.3474,
      yInches: 1.05,
      fontSize: 10,
      maxWidthInches: 1.7,
      color: "#4b5563",
      fontFile: FONT_KNOCKOUT_49,
    },
    {
      key: "role",
      page: 0,
      xInches: 0.3474,
      yInches: 1.195,
      fontSize: 9,
      maxWidthInches: 1.7,
      color: "#4b5563",
      fontFile: FONT_KNOCKOUT_49,
    },
    // Contact block + disclosure – Knockout 30
    {
      key: "email",
      page: 0,
      xInches: 0.3474,
      yInches: 1.525,
      fontSize: 9,
      maxWidthInches: 1.7,
      color: "#6b7280",
      fontFile: FONT_KNOCKOUT_30,
    },
    {
      key: "phone",
      page: 0,
      xInches: 0.3474,
      yInches: 1.655,
      fontSize: 9,
      maxWidthInches: 1.7,
      color: "#6b7280",
      fontFile: FONT_KNOCKOUT_30,
    },
    {
      key: "address",
      page: 0,
      xInches: 0.3474,
      yInches: 1.78,
      fontSize: 9,
      maxWidthInches: 1.7,
      color: "#6b7280",
      fontFile: FONT_KNOCKOUT_30,
    },
    {
      key: "website",
      page: 0,
      xInches: 0.3474,
      yInches: 1.9375,
      fontSize: 9,
      maxWidthInches: 1.7,
      color: "#6b7280",
      fontFile: FONT_KNOCKOUT_30,
    },
    {
      key: "disclosure",
      page: 1,
      xInches: 0.4416,
      yInches: 0.3474,
      fontSize: 7,
      maxWidthInches: 3.15,
      color: "#6b7280",
      fontFile: FONT_KNOCKOUT_30,
    },
  ],
};

module.exports = {
  businessCardTemplate,
};

