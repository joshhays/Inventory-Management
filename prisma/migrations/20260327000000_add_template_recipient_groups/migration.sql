-- AlterTable: add recipientType to NotificationTemplate
ALTER TABLE "NotificationTemplate" ADD COLUMN "recipientType" TEXT NOT NULL DEFAULT 'customer';

-- CreateTable: NotificationTemplateRecipient
CREATE TABLE "NotificationTemplateRecipient" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationTemplateRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplateRecipient_templateId_groupId_key" ON "NotificationTemplateRecipient"("templateId", "groupId");

-- AddForeignKey
ALTER TABLE "NotificationTemplateRecipient" ADD CONSTRAINT "NotificationTemplateRecipient_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationTemplateRecipient" ADD CONSTRAINT "NotificationTemplateRecipient_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
