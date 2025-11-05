-- Add unique index to enable CONCURRENT refresh of materialized view
-- This allows non-blocking refresh operations that don't lock the view for reads
CREATE UNIQUE INDEX IF NOT EXISTS state_generation_mv_unique_idx 
ON state_generation_mv (state_id, year);