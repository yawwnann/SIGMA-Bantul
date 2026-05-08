-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "ShelterStatus" AS ENUM ('ACTIVE', 'STANDBY', 'UNAVAILABLE');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SHELTER_OFFICER';

-- DropIndex
DROP INDEX "BpbdRiskZone_geom_idx";

-- AlterTable
ALTER TABLE "BpbdRiskZone"
ALTER COLUMN "kecamatan" SET DATA TYPE TEXT,
ALTER COLUMN "desa" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "bahaya" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Road"
ADD COLUMN "cost" DOUBLE PRECISION,
ADD COLUMN "length_m" DOUBLE PRECISION,
ADD COLUMN "reverse_cost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Shelter"
ADD COLUMN "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" "ShelterStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelterLog" (
    "id" SERIAL NOT NULL,
    "shelterId" INTEGER NOT NULL,
    "officerId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShelterLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key"
ON "PushSubscription"("endpoint");

-- AddForeignKey
ALTER TABLE "PushSubscription"
ADD CONSTRAINT "PushSubscription_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;