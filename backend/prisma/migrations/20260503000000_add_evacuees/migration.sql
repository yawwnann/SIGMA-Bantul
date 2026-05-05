-- CreateEnum
CREATE TYPE "EvacueeStatus" AS ENUM ('ACTIVE', 'RELOCATED', 'RETURNED_HOME');

-- CreateEnum
CREATE TYPE "EvacueeGender" AS ENUM ('MALE', 'FEMALE');

-- CreateTable
CREATE TABLE "Evacuee" (
    "id" SERIAL NOT NULL,
    "shelterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nik" TEXT,
    "gender" "EvacueeGender" NOT NULL,
    "age" INTEGER NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "familySize" INTEGER NOT NULL DEFAULT 1,
    "specialNeeds" TEXT,
    "medicalCondition" TEXT,
    "status" "EvacueeStatus" NOT NULL DEFAULT 'ACTIVE',
    "checkInDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutDate" TIMESTAMP(3),
    "notes" TEXT,
    "registeredBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evacuee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evacuee_shelterId_idx" ON "Evacuee"("shelterId");

-- CreateIndex
CREATE INDEX "Evacuee_status_idx" ON "Evacuee"("status");

-- CreateIndex
CREATE INDEX "Evacuee_nik_idx" ON "Evacuee"("nik");

-- AddForeignKey
ALTER TABLE "Evacuee" ADD CONSTRAINT "Evacuee_shelterId_fkey" FOREIGN KEY ("shelterId") REFERENCES "Shelter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evacuee" ADD CONSTRAINT "Evacuee_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
