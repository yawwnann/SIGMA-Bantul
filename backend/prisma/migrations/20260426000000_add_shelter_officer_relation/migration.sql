-- AlterTable: Add officerId to Shelter
ALTER TABLE "Shelter" ADD COLUMN "officerId" INTEGER;

-- AddForeignKey
ALTER TABLE "Shelter" ADD CONSTRAINT "Shelter_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
