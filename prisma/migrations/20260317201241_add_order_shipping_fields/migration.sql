-- Add shipping fields to Order (minimal migration - printPdfPath already exists on Railway)
ALTER TABLE "Order" ADD COLUMN "shippingCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "shippingMethod" TEXT;
