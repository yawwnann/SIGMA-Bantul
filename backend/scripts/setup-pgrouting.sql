-- Setup pgRouting for Road Network

-- 1. Enable pgRouting extension
CREATE EXTENSION IF NOT EXISTS pgrouting;

-- 2. Add routing columns if not exists
ALTER TABLE "Road" 
ADD COLUMN IF NOT EXISTS source INTEGER,
ADD COLUMN IF NOT EXISTS target INTEGER,
ADD COLUMN IF NOT EXISTS cost DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS reverse_cost DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS length_m DOUBLE PRECISION;

-- 3. Calculate length in meters
UPDATE "Road" 
SET length_m = ST_Length(geom::geography)
WHERE length_m IS NULL;

-- 4. Set cost based on length (in minutes, assuming 40 km/h average speed)
UPDATE "Road" 
SET cost = (length_m / 1000.0) / 40.0 * 60.0,
    reverse_cost = (length_m / 1000.0) / 40.0 * 60.0
WHERE cost IS NULL;

-- 5. Create topology (this connects road segments into a network graph)
-- Tolerance 0.001 degrees (~111 meters)
SELECT pgr_createTopology('Road', 0.001, 'geom', 'id');

-- 6. Analyze topology for validation
SELECT pgr_analyzeGraph('Road', 0.001, 'geom', 'id');

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS road_source_idx ON "Road"(source);
CREATE INDEX IF NOT EXISTS road_target_idx ON "Road"(target);
CREATE INDEX IF NOT EXISTS road_geom_idx ON "Road" USING GIST(geom);

-- 8. Show statistics
SELECT 
    COUNT(*) as total_roads,
    SUM(length_m) / 1000.0 as total_length_km,
    AVG(length_m) as avg_segment_length_m,
    COUNT(DISTINCT source) as total_nodes
FROM "Road"
WHERE source IS NOT NULL;

-- 9. Check for isolated segments (segments not connected to network)
SELECT COUNT(*) as isolated_segments
FROM "Road"
WHERE source IS NULL OR target IS NULL;

-- Done!
SELECT '✅ pgRouting setup complete!' as status;
