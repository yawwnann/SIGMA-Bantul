-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgrouting";

-- AlterTable
ALTER TABLE "Earthquake" ADD COLUMN     "geom" geometry(Point, 4326);

-- AlterTable
ALTER TABLE "HazardZone" ADD COLUMN     "geom" geometry(Polygon, 4326);

-- AlterTable
ALTER TABLE "Road" ADD COLUMN     "geom" geometry(LineString, 4326),
ADD COLUMN     "safe_cost" DOUBLE PRECISION,
ADD COLUMN     "source" INTEGER,
ADD COLUMN     "target" INTEGER;

-- AlterTable
ALTER TABLE "Shelter" ADD COLUMN     "geom" geometry(Point, 4326);
