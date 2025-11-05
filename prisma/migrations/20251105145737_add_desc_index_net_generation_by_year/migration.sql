-- Add DESC index on net_generation for fast top-N queries
-- This is especially useful for current year queries (e.g., WHERE year = 2023)
-- The DESC order allows efficient ORDER BY net_generation DESC queries

-- Index for year-specific top-N queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_plant_gen_year_netgen_desc 
ON plant_generations (year, net_generation DESC);

-- Index for global top-N queries across all years
CREATE INDEX IF NOT EXISTS idx_plant_gen_netgen_desc 
ON plant_generations (net_generation DESC);

-- Partial index for current year (2023) - even faster for current year queries
CREATE INDEX IF NOT EXISTS idx_plant_gen_2023_netgen_desc 
ON plant_generations (net_generation DESC) 
WHERE year = 2023;

-- Comments on usage:
-- 1. idx_plant_gen_year_netgen_desc: For queries like "top 10 plants in 2023"
--    SELECT * FROM plant_generations WHERE year = 2023 ORDER BY net_generation DESC LIMIT 10;
--
-- 2. idx_plant_gen_netgen_desc: For queries like "top 10 plants across all years"
--    SELECT * FROM plant_generations ORDER BY net_generation DESC LIMIT 10;
--
-- 3. idx_plant_gen_2023_netgen_desc: Partial index for most recent year (smaller, faster)
--    SELECT * FROM plant_generations WHERE year = 2023 ORDER BY net_generation DESC LIMIT 10;