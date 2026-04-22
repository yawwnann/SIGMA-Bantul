-- Setup pgRouting for Road Network with BPBD Risk Integration

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
-- This is the basic cost without hazard consideration
UPDATE "Road" 
SET cost = (length_m / 1000.0) / 40.0 * 60.0,
    reverse_cost = (length_m / 1000.0) / 40.0 * 60.0
WHERE cost IS NULL;

-- 5. Update safe_cost with combined hazard (if BPBD data is available)
-- Formula: safe_cost = length * (1 + combinedHazard * 0.5)
-- This incorporates both earthquake frequency and BPBD risk zones
UPDATE "Road"
SET safe_cost = length_m * (1 + COALESCE("combinedHazard", 2) * 0.5)
WHERE geom IS NOT NULL AND "combinedHazard" IS NOT NULL;

-- 6. For roads without combined hazard, use basic cost
UPDATE "Road"
SET safe_cost = length_m
WHERE safe_cost IS NULL AND length_m IS NOT NULL;

-- 7. Create topology (this connects road segments into a network graph)
-- Tolerance 0.001 degrees (~111 meters)
SELECT pgr_createTopology('Road', 0.001, 'geom', 'id');

-- 8. Analyze topology for validation
SELECT pgr_analyzeGraph('Road', 0.001, 'geom', 'id');

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS road_source_idx ON "Road"(source);
CREATE INDEX IF NOT EXISTS road_target_idx ON "Road"(target);
CREATE INDEX IF NOT EXISTS road_geom_idx ON "Road" USING GIST(geom);
CREATE INDEX IF NOT EXISTS road_safe_cost_idx ON "Road"(safe_cost);
CREATE INDEX IF NOT EXISTS road_combined_hazard_idx ON "Road"("combinedHazard");

-- 10. Show statistics
SELECT 
    COUNT(*) as total_roads,
    SUM(length_m) / 1000.0 as total_length_km,
    AVG(length_m) as avg_segment_length_m,
    COUNT(DISTINCT source) as total_nodes,
    COUNT(CASE WHEN "combinedHazard" IS NOT NULL THEN 1 END) as roads_with_bpbd,
    AVG("combinedHazard") as avg_combined_hazard,
    AVG(safe_cost) as avg_safe_cost
FROM "Road"
WHERE source IS NOT NULL;

-- 11. Check for isolated segments (segments not connected to network)
SELECT COUNT(*) as isolated_segments
FROM "Road"
WHERE source IS NULL OR target IS NULL;

-- 12. Show BPBD risk distribution
SELECT 
    "bpbdRiskLevel",
    COUNT(*) as count,
    AVG("combinedHazard") as avg_hazard,
    AVG(safe_cost) as avg_cost
FROM "Road"
WHERE "bpbdRiskLevel" IS NOT NULL
GROUP BY "bpbdRiskLevel"
ORDER BY "bpbdRiskLevel";

-- Done!
SELECT '✅ pgRouting setup complete with BPBD risk integration!' as status;
