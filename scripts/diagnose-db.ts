import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function diagnose() {
  console.log("🔍 Diagnosing test database...\n");

  try {
    // Count states
    const stateCount = await prisma.state.count();
    console.log(`States: ${stateCount}`);

    // Count plants
    const plantCount = await prisma.plant.count();
    console.log(`Plants: ${plantCount}`);

    // Count plant generations
    const generationCount = await prisma.plantGeneration.count();
    console.log(`Plant Generations: ${generationCount}`);

    // Count state generations
    const stateGenerationCount = await prisma.stateGeneration.count();
    console.log(`State Generations (table): ${stateGenerationCount}\n`);

    // Check materialized view
    const mvData: any = await prisma.$queryRaw`
      SELECT * FROM state_generation_mv LIMIT 5;
    `;
    console.log("Materialized View Data:");
    console.log(mvData);
    console.log();

    // Check if refresh is needed
    console.log("🔄 Refreshing materialized view...");
    await prisma.$executeRaw`
      REFRESH MATERIALIZED VIEW CONCURRENTLY state_generation_mv;
    `;
    console.log("✅ Materialized view refreshed!\n");

    // Check again after refresh
    const mvDataAfter: any = await prisma.$queryRaw`
      SELECT * FROM state_generation_mv LIMIT 5;
    `;
    console.log("Materialized View Data (after refresh):");
    console.log(mvDataAfter);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
