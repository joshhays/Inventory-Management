-- CreateTable: AdminGroup
CREATE TABLE "AdminGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "deploymentId" INTEGER NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "AdminGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdminGroupMember
CREATE TABLE "AdminGroupMember" (
    "userId" INTEGER NOT NULL,
    "adminGroupId" INTEGER NOT NULL,

    CONSTRAINT "AdminGroupMember_pkey" PRIMARY KEY ("userId","adminGroupId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminGroup_name_deploymentId_key" ON "AdminGroup"("name", "deploymentId");

-- AddForeignKey
ALTER TABLE "AdminGroup" ADD CONSTRAINT "AdminGroup_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminGroupMember" ADD CONSTRAINT "AdminGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminGroupMember" ADD CONSTRAINT "AdminGroupMember_adminGroupId_fkey" FOREIGN KEY ("adminGroupId") REFERENCES "AdminGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
