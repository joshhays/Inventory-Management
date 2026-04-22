-- Country for saved addresses; existing rows use US.
ALTER TABLE "SavedAddress" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'US';
