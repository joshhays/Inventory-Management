#!/usr/bin/env node
/**
 * Test the POD preview endpoint: generates a business card PDF with sample data.
 * Run with the API server up: node scripts/test-pod.js
 * Output: test-card.pdf in the project root.
 */

const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}`;

const sampleData = {
  name: "Jane Smith",
  title: "Senior Manager",
  role: "Operations",
  email: "jane.smith@example.com",
  phone: "(555) 123-4567",
  address: "123 Main St, Suite 100, Anytown ST 12345",
  website: "example.com",
  disclosure: "This card is for professional use only. Terms apply.",
};

async function main() {
  const url = `${BASE}/api/pod/preview`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sampleData),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Request failed:", res.status, text);
    process.exit(1);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(__dirname, "..", "test-card.pdf");
  fs.writeFileSync(outPath, buffer);
  console.log("Wrote", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
