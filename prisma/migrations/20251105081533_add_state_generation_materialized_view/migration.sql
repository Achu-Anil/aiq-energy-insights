-- Create materialized view for state generation aggregation
CREATE MATERIALIZED VIEW state_generation_mv AS
SELECT
  p.state_id,
  pg.year,
  SUM(pg.net_generation) AS total_generation
FROM plant_generations pg
JOIN plants p ON p.id = pg.plant_id
GROUP BY p.state_id, pg.year;

-- Create index on materialized view for better query performance
CREATE INDEX idx_state_generation_mv_year_total ON state_generation_mv (year, total_generation);
CREATE INDEX idx_state_generation_mv_state_year ON state_generation_mv (state_id, year);