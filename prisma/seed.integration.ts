import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

/**
 * Lightweight seed for integration tests
 * 
 * Creates minimal, deterministic test data:
 * - 3 states (TX, CA, FL)
 * - 5 plants across these states
 * - Generation data for year 2023
 * 
 * This seed is designed to be fast and reliable for CI/CD environments.
 */
async function seedIntegration() {
  console.log("🌱 Starting integration test seed...\n");

  const TEST_YEAR = parseInt(process.env.TEST_SEED_YEAR || "2023", 10);
  console.log(`📅 Seeding for year: ${TEST_YEAR}\n`);

  try {
    // Clean existing data (in reverse order of dependencies)
    console.log("🧹 Cleaning existing data...");
    await prisma.stateGeneration.deleteMany();
    await prisma.plantGeneration.deleteMany();
    await prisma.plant.deleteMany();
    await prisma.state.deleteMany();
    console.log("✓ Database cleaned\n");

    // Create states
    console.log("📍 Creating states...");
    const states = await prisma.$transaction([
      prisma.state.create({ data: { code: "TX", name: "Texas" } }),
      prisma.state.create({ data: { code: "CA", name: "California" } }),
      prisma.state.create({ data: { code: "FL", name: "Florida" } }),
    ]);
    console.log(`✓ Created ${states.length} states\n`);

    // Create plants with generation data
    console.log("⚡ Creating plants and generation records...");
    const plantsData = [
      { name: "South Texas Project", stateId: states[0].id, generation: 21787144 },
      { name: "Comanche Peak", stateId: states[0].id, generation: 18653890 },
      { name: "Palo Verde", stateId: states[1].id, generation: 31522590 },
      { name: "Diablo Canyon", stateId: states[1].id, generation: 17892234 },
      { name: "Turkey Point", stateId: states[2].id, generation: 20061348 },
    ];

    for (const plantData of plantsData) {
      const plant = await prisma.plant.create({
        data: {
          name: plantData.name,
          stateId: plantData.stateId,
        },
      });

      await prisma.plantGeneration.create({
        data: {
          plantId: plant.id,
          year: TEST_YEAR,
          netGeneration: plantData.generation,
        },
      });
    }
    console.log(`✓ Created ${plantsData.length} plants with generation data\n`);

    // Compute state aggregates
    console.log("📊 Computing state generation aggregates...");
    const stateAggregates = await prisma.$queryRaw<
      Array<{ state_id: number; total: bigint }>
    >`
      SELECT p.state_id, SUM(pg.net_generation) as total
      FROM plant_generations pg
      JOIN plants p ON p.id = pg.plant_id
      WHERE pg.year = ${TEST_YEAR}
      GROUP BY p.state_id
    `;

    for (const agg of stateAggregates) {
      await prisma.stateGeneration.create({
        data: {
          stateId: agg.state_id,
          year: TEST_YEAR,
          totalGeneration: Number(agg.total),
        },
      });
    }
    console.log(`✓ Created ${stateAggregates.length} state aggregates\n`);

    // Refresh materialized view if it exists
    console.log("🔄 Refreshing materialized view...");
    try {
      await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY state_generation_mv`;
      console.log("✓ Materialized view refreshed\n");
    } catch (error) {
      // View might not exist or CONCURRENTLY not supported, try without it
      try {
        await prisma.$executeRaw`REFRESH MATERIALIZED VIEW state_generation_mv`;
        console.log("✓ Materialized view refreshed (non-concurrent)\n");
      } catch (mvError) {
        console.log("⚠️  Materialized view refresh skipped (might not exist)\n");
      }
    }

    // Display summary
    console.log("📈 Seed Summary:");
    const counts = {
      states: await prisma.state.count(),
      plants: await prisma.plant.count(),
      plantGenerations: await prisma.plantGeneration.count(),
      stateGenerations: await prisma.stateGeneration.count(),
    };

    console.log(`  States: ${counts.states}`);
    console.log(`  Plants: ${counts.plants}`);
    console.log(`  Plant Generations: ${counts.plantGenerations}`);
    console.log(`  State Generations: ${counts.stateGenerations}`);

    // Verify test data
    const txState = await prisma.state.findUnique({ where: { code: "TX" } });
    const caState = await prisma.state.findUnique({ where: { code: "CA" } });
    
    if (!txState || !caState) {
      throw new Error("Critical test data missing (TX or CA state)");
    }

    console.log("\n✅ Integration test seed completed successfully!");
    console.log(`   Year: ${TEST_YEAR}`);
    console.log(`   States: TX, CA, FL`);
    console.log(`   Ready for integration tests\n`);
  } catch (error) {
    console.error("\n❌ Integration seed failed:", error);
    throw error;
  }
}

async function main() {
  await seedIntegration();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
