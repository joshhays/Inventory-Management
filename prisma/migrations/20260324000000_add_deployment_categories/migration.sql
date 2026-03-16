-- CreateTable
CREATE TABLE "DeploymentCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deploymentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeploymentCategory_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentCategory_deploymentId_name_key" ON "DeploymentCategory"("deploymentId", "name");
