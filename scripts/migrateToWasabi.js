#!/usr/bin/env node
/**
 * One-time migration: move local image files to Wasabi.
 *
 * Scans Deployment.logoUrl and ProductFile.path. When a value points to a
 * local file under uploads/, reads it, uploads to Wasabi, and updates the DB.
 *
 * Usage:
 *   node scripts/migrateToWasabi.js          # run migration
 *   node scripts/migrateToWasabi.js --dry-run   # preview only, no writes
 *
 * Requires: WASABI_ACCESS_KEY, WASABI_SECRET_KEY, WASABI_BUCKET, etc.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const prisma = require("../src/lib/prisma");
const wasabiService = require("../src/services/wasabi.service");

const UPLOAD_DIR = path.join(__dirname, "../uploads");
const DRY_RUN = process.argv.includes("--dry-run");

function getContentType(filePath) {
  const ext = (path.extname(filePath) || "").toLowerCase();
  const map = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

async function migrateDeployments() {
  const deployments = await prisma.deployment.findMany({
    where: {
      AND: [
        { logoUrl: { not: null } },
        { logoUrl: { startsWith: "/uploads/" } },
      ],
    },
  });

  let migrated = 0;
  for (const d of deployments) {
    const localPath = path.join(__dirname, "..", d.logoUrl);
    if (!fs.existsSync(localPath)) {
      console.warn(`  [Deployment ${d.id}] File not found: ${d.logoUrl}`);
      continue;
    }

    const buffer = fs.readFileSync(localPath);
    const fileName = path.basename(d.logoUrl);
    const contentType = getContentType(fileName);
    const fileKey = await wasabiService.uploadFile(buffer, fileName, contentType, "deployment-logos");

    if (!fileKey) {
      console.error(`  [Deployment ${d.id}] Wasabi upload failed for ${d.logoUrl}`);
      continue;
    }

    if (!DRY_RUN) {
      await prisma.deployment.update({
        where: { id: d.id },
        data: { logoUrl: fileKey },
      });
    }
    console.log(`  [Deployment ${d.id}] ${d.logoUrl} -> ${fileKey}`);
    migrated++;
  }
  return migrated;
}

async function migrateProductFiles() {
  const files = await prisma.productFile.findMany({
    where: {
      path: { startsWith: "product-" },
    },
    include: { product: true },
  });

  let migrated = 0;
  for (const f of files) {
    const localPath = path.join(UPLOAD_DIR, f.path);
    if (!fs.existsSync(localPath)) {
      console.warn(`  [ProductFile ${f.id}] File not found: ${f.path}`);
      continue;
    }

    const buffer = fs.readFileSync(localPath);
    const fileName = path.basename(f.path);
    const contentType = getContentType(fileName);
    const subfolder = `products/product-${f.productId}`;
    const fileKey = await wasabiService.uploadFile(buffer, fileName, contentType, subfolder);

    if (!fileKey) {
      console.error(`  [ProductFile ${f.id}] Wasabi upload failed for ${f.path}`);
      continue;
    }

    if (!DRY_RUN) {
      await prisma.productFile.update({
        where: { id: f.id },
        data: { path: fileKey },
      });
    }
    console.log(`  [ProductFile ${f.id}] ${f.path} -> ${fileKey}`);
    migrated++;
  }
  return migrated;
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN (no DB or disk changes) ===\n" : "=== Migrate local files to Wasabi ===\n");

  if (!wasabiService.isConfigured()) {
    console.error("Error: Wasabi is not configured. Set WASABI_ACCESS_KEY, WASABI_SECRET_KEY, WASABI_BUCKET.");
    process.exit(1);
  }

  try {
    console.log("Deployments (logoUrl starting with /uploads/)...");
    const dCount = await migrateDeployments();
    console.log(`  Migrated: ${dCount}\n`);

    console.log("ProductFiles (path starting with product-)...");
    const pCount = await migrateProductFiles();
    console.log(`  Migrated: ${pCount}\n`);

    console.log(`Done. Total: ${dCount + pCount} files.`);
    if (DRY_RUN) console.log("(Dry run - no changes were made. Run without --dry-run to apply.)");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
