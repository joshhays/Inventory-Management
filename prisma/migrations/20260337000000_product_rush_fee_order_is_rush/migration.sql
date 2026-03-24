-- AlterTable
ALTER TABLE "Product" ADD COLUMN "rushFee" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "isRush" BOOLEAN NOT NULL DEFAULT false;
