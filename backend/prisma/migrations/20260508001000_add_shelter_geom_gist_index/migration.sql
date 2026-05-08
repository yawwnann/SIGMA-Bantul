-- Speed up PostGIS ST_DWithin and nearest-neighbor ORDER BY geom <-> point.
CREATE INDEX IF NOT EXISTS "Shelter_geom_gist_idx"
ON "Shelter"
USING GIST (geom);
