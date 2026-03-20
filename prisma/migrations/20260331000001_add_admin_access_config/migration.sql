-- AlterTable: add adminAccessConfig for Pageflex-style access matrix
ALTER TABLE "Deployment" ADD COLUMN IF NOT EXISTS "adminAccessConfig" TEXT;
