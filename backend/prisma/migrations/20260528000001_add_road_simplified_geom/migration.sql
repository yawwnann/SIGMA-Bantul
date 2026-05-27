-- Add pre-computed simplified geometry column to avoid ST_SimplifyPreserveTopology on every query
-- This reduces CPU overhead on /api/roads/network endpoint

-- Add the simplified geometry column
ALTER TABLE "Road" ADD COLUMN IF NOT EXISTS geom_simplified geometry(LineString, 4326);

-- Spatial index for the simplified geometry
CREATE INDEX IF NOT EXISTS "Road_geom_simplified_gist_idx" ON "Road" USING GIST (geom_simplified);