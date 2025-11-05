/*
  Warnings:

  - You are about to drop the column `netGeneration` on the `Plant` table. All the data in the column will be lost.
  - You are about to drop the column `percentOfState` on the `Plant` table. All the data in the column will be lost.
  - You are about to drop the column `totalGeneration` on the `State` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,stateId]` on the table `Plant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Plant" DROP COLUMN "netGeneration",
DROP COLUMN "percentOfState";

-- AlterTable
ALTER TABLE "State" DROP COLUMN "totalGeneration";

-- CreateTable
CREATE TABLE "PlantGeneration" (
    "id" SERIAL NOT NULL,
    "plantId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "netGeneration" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PlantGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateGeneration" (
    "id" SERIAL NOT NULL,
    "stateId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalGeneration" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "StateGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlantGeneration_year_netGeneration_idx" ON "PlantGeneration"("year", "netGeneration");

-- CreateIndex
CREATE INDEX "PlantGeneration_plantId_year_idx" ON "PlantGeneration"("plantId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PlantGeneration_plantId_year_key" ON "PlantGeneration"("plantId", "year");

-- CreateIndex
CREATE INDEX "StateGeneration_year_totalGeneration_idx" ON "StateGeneration"("year", "totalGeneration");

-- CreateIndex
CREATE UNIQUE INDEX "StateGeneration_stateId_year_key" ON "StateGeneration"("stateId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Plant_name_stateId_key" ON "Plant"("name", "stateId");

-- AddForeignKey
ALTER TABLE "PlantGeneration" ADD CONSTRAINT "PlantGeneration_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateGeneration" ADD CONSTRAINT "StateGeneration_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
