function normalizeHeader(header) {
  return header.trim().toLowerCase();
}

function mapRowToProduct(row) {
  const headers = Object.keys(row).reduce((acc, h) => {
    acc[normalizeHeader(h)] = h;
    return acc;
  }, {});

  const get = (...candidates) => {
    for (const c of candidates) {
      const key = headers[c.toLowerCase()];
      if (key && row[key] !== undefined && String(row[key]).trim() !== "") return row[key];
    }
    return null;
  };

  const name = get("name", "productname", "product", "product_name");
  const sku = get("sku", "product_sku", "item_sku");
  const quantityVal = get("numberonhand", "numberavailable", "quantity", "qty", "stock", "inventory", "primarybinquantity", "secondarybinquantity");
  const quantity = parseInt(quantityVal, 10);
  const price = get("price", "unit_price", "cost") ?? "0";
  const description = get("description", "desc", "notes");
  const category = get("category", "categories", "type");

  if (!name || !sku) return null;

  const priceNum = parseFloat(String(price).trim());
  return {
    name: String(name).trim(),
    sku: String(sku).trim(),
    quantity: isNaN(quantity) ? 0 : Math.max(0, quantity),
    price: isNaN(priceNum) ? 0 : priceNum,
    description: description ? String(description).trim() : null,
    category: category ? String(category).trim() : null,
  };
}

module.exports = { mapRowToProduct };
