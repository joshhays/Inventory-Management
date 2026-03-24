-- AlterTable: add username (unique). Backfill existing users with 'user' || id to ensure uniqueness.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Backfill: set username = 'user' || id for existing rows (guarantees unique)
UPDATE "User" SET "username" = 'user' || "id"::text WHERE "username" IS NULL;

-- Now make it required and unique
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
