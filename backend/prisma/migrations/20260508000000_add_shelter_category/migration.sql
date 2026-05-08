-- CreateEnum
CREATE TYPE "ShelterCategory" AS ENUM ('SCHOOL', 'FIELD', 'GOVERNMENT');

-- Add category to existing Shelter rows without dropping the table.
-- The temporary default keeps the migration safe when rows already exist.
ALTER TABLE "Shelter"
ADD COLUMN "category" "ShelterCategory" NOT NULL DEFAULT 'GOVERNMENT';

ALTER TABLE "Shelter"
ALTER COLUMN "category" DROP DEFAULT;

-- Capacity is now optional in imports and defaults to 0 for potential locations.
ALTER TABLE "Shelter"
ALTER COLUMN "capacity" SET DEFAULT 0;
