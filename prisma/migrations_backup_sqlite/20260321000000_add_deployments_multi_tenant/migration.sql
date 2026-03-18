-- CreateTable
CREATE TABLE "Deployment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Seed default deployments
INSERT INTO "Deployment" ("id", "name", "slug", "logoUrl", "createdAt", "updatedAt")
VALUES
  (1, '@properties', 'atproperties', '/logo.png', datetime('now'), datetime('now')),
  (2, 'Other Company', 'other', NULL, datetime('now'), datetime('now'));

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_slug_key" ON "Deployment"("slug");

-- AlterTable UserGroup: add deploymentId
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_UserGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "deploymentId" INTEGER NOT NULL,
    CONSTRAINT "UserGroup_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserGroup" ("id", "name", "deploymentId") SELECT "id", "name", 1 FROM "UserGroup";
DROP TABLE "UserGroup";
ALTER TABLE "new_UserGroup" RENAME TO "UserGroup";
CREATE UNIQUE INDEX "UserGroup_name_deploymentId_key" ON "UserGroup"("name", "deploymentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- AlterTable Product: add deploymentId, change sku unique to composite
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deploymentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "price" REAL NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "productType" TEXT NOT NULL DEFAULT 'regular',
    "groupId" INTEGER,
    "isPrintOnDemand" INTEGER NOT NULL DEFAULT 0,
    "printTemplateConfig" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("id", "deploymentId", "name", "sku", "quantity", "price", "description", "category", "productType", "groupId", "isPrintOnDemand", "printTemplateConfig", "createdAt", "updatedAt")
SELECT "id", 1, "name", "sku", "quantity", "price", "description", "category", "productType", "groupId", "isPrintOnDemand", "printTemplateConfig", "createdAt", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_deploymentId_sku_key" ON "Product"("deploymentId", "sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- AlterTable Order: add deploymentId (recreate to add FK)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deploymentId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shippingAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" REAL NOT NULL,
    "pickingStartedAt" DATETIME,
    "pickingCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("id", "deploymentId", "customerName", "customerEmail", "customerPhone", "shippingAddress", "status", "total", "pickingStartedAt", "pickingCompletedAt", "createdAt", "updatedAt")
SELECT "id", 1, "customerName", "customerEmail", "customerPhone", "shippingAddress", "status", "total", "pickingStartedAt", "pickingCompletedAt", "createdAt", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
