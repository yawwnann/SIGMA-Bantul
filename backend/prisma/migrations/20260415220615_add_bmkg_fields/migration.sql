/*
  Warnings:

  - A unique constraint covering the columns `[bmkgId]` on the table `Earthquake` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Earthquake" ADD COLUMN     "bmkgId" TEXT,
ADD COLUMN     "potential" TEXT,
ADD COLUMN     "shakemapUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Earthquake_bmkgId_key" ON "Earthquake"("bmkgId");
