/*
  Warnings:

  - You are about to drop the `Plant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlantGeneration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `State` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StateGeneration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Plant" DROP CONSTRAINT "Plant_stateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlantGeneration" DROP CONSTRAINT "PlantGeneration_plantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."StateGeneration" DROP CONSTRAINT "StateGeneration_stateId_fkey";

-- DropTable
DROP TABLE "public"."Plant";

-- DropTable
DROP TABLE "public"."PlantGeneration";

-- DropTable
DROP TABLE "public"."State";

-- DropTable
DROP TABLE "public"."StateGeneration";

-- CreateTable
CREATE TABLE "states" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plants" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "state_id" INTEGER NOT NULL,

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plant_generations" (
    "id" SERIAL NOT NULL,
    "plant_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "net_generation" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "plant_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state_generations" (
    "id" SERIAL NOT NULL,
    "state_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "total_generation" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "state_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "states"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plants_name_state_id_key" ON "plants"("name", "state_id");

-- CreateIndex
CREATE INDEX "plant_generations_year_net_generation_idx" ON "plant_generations"("year", "net_generation");

-- CreateIndex
CREATE INDEX "plant_generations_plant_id_year_idx" ON "plant_generations"("plant_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "plant_generations_plant_id_year_key" ON "plant_generations"("plant_id", "year");

-- CreateIndex
CREATE INDEX "state_generations_year_total_generation_idx" ON "state_generations"("year", "total_generation");

-- CreateIndex
CREATE UNIQUE INDEX "state_generations_state_id_year_key" ON "state_generations"("state_id", "year");

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plant_generations" ADD CONSTRAINT "plant_generations_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "state_generations" ADD CONSTRAINT "state_generations_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
