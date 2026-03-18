#!/usr/bin/env node
/**
 * Remove failed migration record so migrate deploy can run.
 * Uses better-sqlite3 directly to avoid Prisma schema validation issues.
 */
require("dotenv").config();
const dbUrl = process.env.DATABASE_URL || "";
if (dbUrl.startsWith("postgresql")) {
  process.exit(0);
}
const path = require("path");
const fs = require("fs");

let dbPath = dbUrl.replace(/^file:/, "").trim() || "./dev.db";
if (!path.isAbsolute(dbPath)) {
  dbPath = path.resolve(process.cwd(), dbPath);
}

if (!fs.existsSync(dbPath)) {
  process.exit(0);
}

try {
  const Database = require("better-sqlite3");
  const db = new Database(dbPath, { readonly: false });
  const stmt = db.prepare(
    "DELETE FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NULL"
  );
  const result = stmt.run("20260317201241_add_order_shipping_fields");
  db.close();
  if (result.changes > 0) {
    console.log("Cleared failed migration record");
  }
} catch (err) {
  if (err.code === "SQLITE_ERROR" && err.message.includes("no such table")) {
    process.exit(0);
  }
  console.error("Fix migration error:", err.message);
  process.exit(1);
}
