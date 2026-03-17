-- Add shipping and tracking fields to Order (minimal migration - printPdfPath already exists on Railway)
ALTER TABLE "Order" ADD COLUMN "shippingCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "shippingMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingLabelUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN "upsShipmentId" TEXT;
