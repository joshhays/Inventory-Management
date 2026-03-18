-- Add deploymentId to DashboardWidget (nullable for backwards compatibility)
ALTER TABLE "DashboardWidget" ADD COLUMN "deploymentId" INTEGER;
