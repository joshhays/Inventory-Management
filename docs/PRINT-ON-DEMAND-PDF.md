# Print-on-demand: Making the PDF know which fields are variable

To use an **uploaded PDF** as the master print file and have the system fill in customer data, the PDF must define **variable areas as form fields**. The form field **names** must match the **keys** in your product’s Print Template Config.

## 1. Create the master PDF with form fields

Use a tool that can add **AcroForm** (PDF form) fields:

- **Adobe Acrobat Pro** – Prepare Form / Add text field; set the field name.
- **LibreOffice Draw** – Create the layout, then Insert → Form → Text Box; right‑click → Control → set “Name”.
- **PDF escape** (online) or other PDF form editors.

Add one **text field** for each variable (e.g. name, title, company, phone, email). Place and style them where the text should appear on the final print.

## 2. Name the fields to match your template

The field **name** in the PDF must match the **key** in your product’s `printTemplateConfig` JSON.

Example template config:

```json
{
  "layout": "business_card",
  "fields": [
    { "key": "name", "label": "Full Name" },
    { "key": "title", "label": "Title" },
    { "key": "company", "label": "Company" },
    { "key": "phone", "label": "Phone" },
    { "key": "email", "label": "Email" },
    { "key": "website", "label": "Website", "type": "select", "required": true, "options": ["example.com", "mycompany.com"] }
  ]
}
```

- **Select (dropdown):** Use `"type": "select"` and `"options": ["value1", "value2"]`. Optional `"required": true` blocks Add to cart until a choice is made. In the store, the first option is "Choose one..."; the customer must pick a value.

So in the PDF you must have form fields named exactly:

- `name`
- `title`
- `company`
- `phone`
- `email`

Use lowercase, no spaces. If you use different keys in the JSON (e.g. `companyName`), the PDF form field names must match those keys.

## 3. Upload the PDF to the product

Attach the PDF as a **product file** (Products → Edit product → Files). The system can use this file as the print master when generating filled PDFs (when that feature is implemented).

## Summary

| You want this variable | Template config key | PDF form field name |
|------------------------|---------------------|----------------------|
| Full name              | `name`              | `name`               |
| Job title              | `title`             | `title`              |
| Company                | `company`           | `company`             |
| Phone                  | `phone`             | `phone`              |
| Email                  | `email`             | `email`              |

**Rule:** PDF form field name = `key` in `printTemplateConfig.fields`. That’s how the system knows which fields are variable when merging customer data into the PDF.
