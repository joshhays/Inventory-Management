-- AlterTable: Add Pageflex-style permission flags to AdminGroup
ALTER TABLE "AdminGroup" ADD COLUMN IF NOT EXISTS "canApproveOrders" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AdminGroup" ADD COLUMN IF NOT EXISTS "canManageInventory" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AdminGroup" ADD COLUMN IF NOT EXISTS "canEditUsers" BOOLEAN NOT NULL DEFAULT false;
