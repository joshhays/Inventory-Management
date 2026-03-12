# Product Files

Store PDFs and images here. They are served by the app and can be attached to products from **Manage Products** via a dropdown.

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

Files are referenced by path (e.g. `manual.pdf` or `guides/quick-start.pdf`). The same file can be attached to multiple products.
