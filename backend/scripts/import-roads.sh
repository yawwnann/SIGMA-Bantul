#!/bin/bash

# Script to import road shapefile to PostgreSQL/PostGIS database
# This script uses shp2pgsql utility from PostGIS

# Load environment variables
source ../.env

# Database connection details
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-gis_bantul}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD}"

# Shapefile path
SHP_FILE="../Data/JALAN_LN_25K.shp"
TABLE_NAME="road_network"

echo "🚀 Starting road network import..."
echo "📁 Shapefile: $SHP_FILE"
echo "🗄️  Target table: $TABLE_NAME"

# Check if shapefile exists
if [ ! -f "$SHP_FILE" ]; then
    echo "❌ Error: Shapefile not found at $SHP_FILE"
    exit 1
fi

# Convert SHP to SQL and import to PostgreSQL
# -I: Create spatial index
# -s 4326: Set SRID to WGS84
# -d: Drop table if exists
# -W UTF-8: Set encoding
echo "🔄 Converting shapefile to SQL..."

shp2pgsql -I -s 4326 -d -W UTF-8 "$SHP_FILE" "$TABLE_NAME" | \
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Road network imported successfully!"
    echo ""
    echo "📊 Running post-import processing..."
    
    # Run post-processing SQL
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
    
    -- Add columns for routing if not exists
    ALTER TABLE $TABLE_NAME ADD COLUMN IF NOT EXISTS source INTEGER;
    ALTER TABLE $TABLE_NAME ADD COLUMN IF NOT EXISTS target INTEGER;
    ALTER TABLE $TABLE_NAME ADD COLUMN IF NOT EXISTS cost DOUBLE PRECISION;
    ALTER TABLE $TABLE_NAME ADD COLUMN IF NOT EXISTS reverse_cost DOUBLE PRECISION;
    ALTER TABLE $TABLE_NAME ADD COLUMN IF NOT EXISTS length_m DOUBLE PRECISION;
    
    -- Calculate length in meters
    UPDATE $TABLE_NAME SET length_m = ST_Length(geom::geography);
    
    -- Set cost based on length (in minutes, assuming 40 km/h average speed)
    UPDATE $TABLE_NAME SET cost = (length_m / 1000.0) / 40.0 * 60.0;
    UPDATE $TABLE_NAME SET reverse_cost = cost;
    
    -- Create topology for pgRouting
    SELECT pgr_createTopology('$TABLE_NAME', 0.001, 'geom', 'gid');
    
    -- Analyze topology
    SELECT pgr_analyzeGraph('$TABLE_NAME', 0.001, 'geom', 'gid');
    
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS ${TABLE_NAME}_source_idx ON $TABLE_NAME(source);
    CREATE INDEX IF NOT EXISTS ${TABLE_NAME}_target_idx ON $TABLE_NAME(target);
    CREATE INDEX IF NOT EXISTS ${TABLE_NAME}_geom_idx ON $TABLE_NAME USING GIST(geom);
    
    -- Show statistics
    SELECT 
        COUNT(*) as total_roads,
        SUM(length_m) / 1000.0 as total_length_km,
        AVG(length_m) as avg_segment_length_m
    FROM $TABLE_NAME;
    
EOF
    
    echo "✅ Post-processing completed!"
else
    echo "❌ Error: Failed to import road network"
    exit 1
fi

echo ""
echo "🎉 Road network is ready for routing!"
echo "💡 You can now use pgRouting functions like pgr_dijkstra"
