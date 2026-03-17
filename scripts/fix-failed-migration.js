#!/usr/bin/env node
/**
 * Remove failed migration record so migrate deploy can run.
 * Run before prisma migrate deploy when P3009 occurs.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.$executeRawUnsafe(
      "DELETE FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NULL",
      "20260317201241_add_order_shipping_fields"
    );
    if (count > 0) console.log("Cleared failed migration record");
  } catch (err) {
    if (err.message?.includes("no such table") || err.message?.includes("SQLITE_ERROR")) {
      process.exit(0);
    }
    console.error("Fix migration error:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
