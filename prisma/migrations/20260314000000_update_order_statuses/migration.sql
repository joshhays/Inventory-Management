-- Update old order statuses to new workflow
UPDATE "Order" SET status = 'in process' WHERE status = 'confirmed';
UPDATE "Order" SET status = 'ready' WHERE status = 'completed';
-- shipped stays as shipped
