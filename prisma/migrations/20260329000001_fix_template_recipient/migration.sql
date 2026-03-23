-- Fix NotificationTemplateRecipient: schema expects adminGroupId, migration 20260327000000 created groupId
-- Add adminGroupId, drop groupId, update constraints
ALTER TABLE "NotificationTemplateRecipient" ADD COLUMN IF NOT EXISTS "adminGroupId" INTEGER;
ALTER TABLE "NotificationTemplateRecipient" DROP CONSTRAINT IF EXISTS "NotificationTemplateRecipient_groupId_fkey";
DROP INDEX IF EXISTS "NotificationTemplateRecipient_templateId_groupId_key";
ALTER TABLE "NotificationTemplateRecipient" DROP COLUMN IF EXISTS "groupId";
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationTemplateRecipient_templateId_adminGroupId_key" ON "NotificationTemplateRecipient"("templateId", "adminGroupId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationTemplateRecipient_adminGroupId_fkey') THEN
    ALTER TABLE "NotificationTemplateRecipient" ADD CONSTRAINT "NotificationTemplateRecipient_adminGroupId_fkey" FOREIGN KEY ("adminGroupId") REFERENCES "AdminGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
