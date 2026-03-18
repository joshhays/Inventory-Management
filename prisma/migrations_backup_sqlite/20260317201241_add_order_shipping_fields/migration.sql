-- Add shipping and tracking fields to Order (EasyPost)
ALTER TABLE "Order" ADD COLUMN "shippingCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "shippingMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingLabelUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "easypostShipmentId" TEXT;
