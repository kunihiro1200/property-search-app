-- Add valuation_assigned_by column to sellers table
ALTER TABLE sellers
ADD COLUMN valuation_assigned_by TEXT;

COMMENT ON COLUMN sellers.valuation_assigned_by IS '査定担当者名';
