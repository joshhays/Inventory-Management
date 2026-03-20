-- AlterTable: add displayName for human-readable template name (separate from trigger)
ALTER TABLE "NotificationTemplate" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
