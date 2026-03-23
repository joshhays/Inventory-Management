# Product Files

Store PDFs and images here. They are served by the app and can be attached to products from **Manage Products** via a dropdown.

## Print-on-demand (POD) business cards

For **live preview** and **order print PDFs** to work, place your base business card PDF here:

- **`business-card-base.pdf`** – Blank card layout (front/back). The app fills in name, title, contact info, etc. from the template in `src/podTemplates.js`. Without this file, the storefront will show “Preview not configured” and order print PDFs will fail.

## Folder structure

Files can be at any depth. Examples:

```
product-files/
  manual.pdf
  spec-sheet.pdf
  guides/
    quick-start.pdf
    full-manual.pdf
```

## Supported formats

- PDF
- JPG, JPEG, PNG, GIF, WEBP

## Attaching to products

1. Add files to this folder and commit to your repo.
2. Deploy (or run locally).
3. Go to **Manage Products** → click **Files** on a product.
4. Select a file from the dropdown and click **Attach**.

**Tip:** For products to show images on the store product list, attach a JPG or PNG. PDF-only products use server-side conversion which may show a placeholder in some environments. Images display directly and reliably.

Files are referenced by path (e.g. `manual.pdf` or `guides/quick-start.pdf`). The same file can be attached to multiple products.
