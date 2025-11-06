-- Clean existing data
DELETE FROM state_generations;
DELETE FROM plant_generations;
DELETE FROM plants;
DELETE FROM states;

-- Insert states
INSERT INTO states (code, name) VALUES 
  ('TX', 'Texas'), 
  ('CA', 'California'), 
  ('FL', 'Florida');

-- Insert plants
INSERT INTO plants (name, state_id) VALUES
  ('South Texas Project', (SELECT id FROM states WHERE code = 'TX')),
  ('Comanche Peak', (SELECT id FROM states WHERE code = 'TX')),
  ('Palo Verde', (SELECT id FROM states WHERE code = 'CA')),
  ('Diablo Canyon', (SELECT id FROM states WHERE code = 'CA')),
  ('Turkey Point', (SELECT id FROM states WHERE code = 'FL'));

-- Insert plant generations for 2023
INSERT INTO plant_generations (plant_id, year, net_generation) VALUES
  ((SELECT id FROM plants WHERE name = 'South Texas Project'), 2023, 21787144.00),
  ((SELECT id FROM plants WHERE name = 'Comanche Peak'), 2023, 18653890.00),
  ((SELECT id FROM plants WHERE name = 'Palo Verde'), 2023, 31522590.00),
  ((SELECT id FROM plants WHERE name = 'Diablo Canyon'), 2023, 17892234.00),
  ((SELECT id FROM plants WHERE name = 'Turkey Point'), 2023, 20061348.00);

-- Insert state generations
INSERT INTO state_generations (state_id, year, total_generation)
SELECT p.state_id, 2023, SUM(pg.net_generation)
FROM plant_generations pg
JOIN plants p ON p.id = pg.plant_id
WHERE pg.year = 2023
GROUP BY p.state_id;

-- Verify data
SELECT 'States:' as table_name, COUNT(*) as count FROM states
UNION ALL
SELECT 'Plants:', COUNT(*) FROM plants
UNION ALL
SELECT 'Plant Generations:', COUNT(*) FROM plant_generations
UNION ALL
SELECT 'State Generations:', COUNT(*) FROM state_generations;
