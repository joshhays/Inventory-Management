#!/usr/bin/env node
/**
 * Seed the database from a CSV file.
 * Usage: node scripts/seed-from-csv.js <path-to-csv>
 * Example: node scripts/seed-from-csv.js data/inventory.csv
 *
 * Supported columns (case-insensitive):
 *   name: name, productname, product, product_name
 *   sku: sku, product_sku, item_sku
 *   quantity: numberonhand, numberavailable, quantity, qty, stock, inventory
 *   price: price, unit_price, cost (defaults to 0 if missing)
 *   description: description, desc, notes
 */

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const prisma = require("../src/lib/prisma");

const csvPath = process.argv[2] || path.join(__dirname, "../data/inventory.csv");

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

  if (!name || !sku) {
    return null;
  }

  const priceNum = parseFloat(String(price).trim());
  return {
    name: String(name).trim(),
    sku: String(sku).trim(),
    quantity: isNaN(quantity) ? 0 : Math.max(0, quantity),
    price: isNaN(priceNum) ? 0 : priceNum,
    description: description ? String(description).trim() : null,
  };
}

async function seed() {
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found at ${csvPath}`);
    console.error("Usage: node scripts/seed-from-csv.js <path-to-csv>");
    process.exit(1);
  }

  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  const products = rows.map(mapRowToProduct).filter(Boolean);

  if (products.length === 0) {
    console.error("Error: No valid rows found. Ensure CSV has columns for name and sku (e.g. ProductName, SKU)");
    process.exit(1);
  }

  for (const p of products) {
    try {
      await prisma.product.upsert({
        where: { sku: p.sku },
        create: p,
        update: {
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          description: p.description,
        },
      });
    } catch (err) {
      console.error(`Failed to upsert SKU ${p.sku}:`, err.message);
    }
  }

  const total = await prisma.product.count();
  console.log(`Seeded ${products.length} rows. Total products in database: ${total}`);
}

seed()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
