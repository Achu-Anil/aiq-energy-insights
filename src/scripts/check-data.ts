import { PrismaClient } from "@prisma/client";

async function checkData() {
  const prisma = new PrismaClient();

  try {
    const plantCount = await prisma.plant.count();
    const stateCount = await prisma.state.count();
    const generationCount = await prisma.plantGeneration.count();

    console.log("=== Database Status ===");
    console.log(`States: ${stateCount}`);
    console.log(`Plants: ${plantCount}`);
    console.log(`Generation Records: ${generationCount}`);

    if (plantCount === 0 || stateCount === 0) {
      console.log("\n⚠️  Database is empty! Run seeding script:");
      console.log("   npx ts-node prisma/seed.ts");
    } else {
      console.log("\n✅ Database has data");

      // Sample data
      const samplePlant = await prisma.plantGeneration.findFirst({
        include: {
          plant: {
            include: {
              state: true,
            },
          },
        },
        orderBy: {
          netGeneration: "desc",
        },
      });

      if (samplePlant) {
        console.log("\nSample Plant:");
        console.log(`  Name: ${samplePlant.plant.name}`);
        console.log(`  State: ${samplePlant.plant.state.code}`);
        console.log(`  Year: ${samplePlant.year}`);
        console.log(
          `  Generation: ${samplePlant.netGeneration.toLocaleString()} MWh`
        );
      }
    }
  } catch (error) {
    console.error("Error checking database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
