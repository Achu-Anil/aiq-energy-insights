-- CreateTable
CREATE TABLE "State" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalGeneration" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stateId" INTEGER NOT NULL,
    "netGeneration" DOUBLE PRECISION NOT NULL,
    "percentOfState" DOUBLE PRECISION,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "State_code_key" ON "State"("code");

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
