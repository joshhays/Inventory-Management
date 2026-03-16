-- AlterTable
ALTER TABLE "Product" ADD COLUMN "isPrintOnDemand" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "printTemplateConfig" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "printData" TEXT;
