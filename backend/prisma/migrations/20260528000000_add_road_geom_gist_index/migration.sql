-- Add GIST spatial index on Road.geom for faster ST_Intersects queries
-- This is critical for the /api/roads/network endpoint performance

-- Spatial index for ST_Intersects bounding box filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Road_geom_gist_idx" ON "Road" USING GIST (geom);

-- Index for pgRouting topology lookups (source/target nodes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Road_source_idx" ON "Road" ("source");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Road_target_idx" ON "Road" ("target");