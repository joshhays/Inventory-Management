-- AlterTable: add customEmails to NotificationTemplate for custom_emails recipient type
ALTER TABLE "NotificationTemplate" ADD COLUMN IF NOT EXISTS "customEmails" TEXT;
