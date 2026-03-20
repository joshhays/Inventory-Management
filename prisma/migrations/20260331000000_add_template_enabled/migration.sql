-- AlterTable: add enabled flag for Pageflex-style notification toggles
ALTER TABLE "NotificationTemplate" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT true;
