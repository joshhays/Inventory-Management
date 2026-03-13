# Fonts for print-on-demand PDFs

Drop your font files here (`.ttf` or `.otf`).

- **Supported:** TrueType (`.ttf`), OpenType (`.otf`)
- **Usage:** The POD PDF service can load these for custom text on business cards. Code in `src/services/podPdf.service.js` must be updated to read and embed the font(s) you add; by default the service uses the built-in Helvetica.

Example: add `MyBrand-Regular.ttf` and optionally `MyBrand-Bold.ttf`, then configure the service to use them.
