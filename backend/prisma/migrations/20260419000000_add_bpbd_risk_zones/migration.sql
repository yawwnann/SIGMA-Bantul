-- CreateEnum
CREATE TYPE "BpbdRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "BpbdRiskZone" (
    "id" SERIAL NOT NULL,
    "kecamatan" VARCHAR(255) NOT NULL,
    "desa" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "riskLevel" "BpbdRiskLevel" NOT NULL,
    "bahaya" VARCHAR(50),
    "iaGempa" INTEGER,
    "taGempa" INTEGER,
    "tRisk" DOUBLE PRECISION,
    "skorTRisk" DOUBLE PRECISION,
    "kodeDesa" DOUBLE PRECISION,
    "kodeKec" INTEGER,
    "geometry" JSONB NOT NULL,
    "geom" geometry(MultiPolygon, 4326),
    "area" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BpbdRiskZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BpbdRiskZone_riskLevel_idx" ON "BpbdRiskZone"("riskLevel");

-- CreateIndex
CREATE INDEX "BpbdRiskZone_kecamatan_idx" ON "BpbdRiskZone"("kecamatan");

-- CreateIndex
CREATE INDEX "BpbdRiskZone_desa_idx" ON "BpbdRiskZone"("desa");

-- CreateIndex (Spatial)
CREATE INDEX "BpbdRiskZone_geom_idx" ON "BpbdRiskZone" USING GIST ("geom");

-- AlterTable (Add BPBD columns to Road)
ALTER TABLE "Road" 
    ADD COLUMN "bpbdRiskLevel" "BpbdRiskLevel",
    ADD COLUMN "bpbdRiskScore" DOUBLE PRECISION,
    ADD COLUMN "combinedHazard" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Road_bpbdRiskLevel_idx" ON "Road"("bpbdRiskLevel");
