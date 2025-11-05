import { PrismaClient } from "../src/generated/prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface PlantData {
  plantName: string;
  stateCode: string;
  netGeneration: number;
  year?: number;
}

/**
 * Seed script to populate database from JSON export
 * Expects JSON file with plant data in the following format:
 * [
 *   {
 *     "plantName": "Plant Name",
 *     "stateCode": "TX",
 *     "netGeneration": 123456.78,
 *     "year": 2021
 *   }
 * ]
 */
async function seed() {
  console.log("🌱 Starting database seed...\n");

  try {
    // Read JSON data file
    const dataPath = path.join(__dirname, "../data/plants-export.json");

    if (!fs.existsSync(dataPath)) {
      console.log("⚠️  No JSON export found at:", dataPath);
      console.log("Creating sample data instead...\n");
      await seedSampleData();
      return;
    }

    const rawData = fs.readFileSync(dataPath, "utf-8");
    const plants: PlantData[] = JSON.parse(rawData);

    console.log(`📊 Found ${plants.length} plants in JSON export\n`);

    // Extract unique states
    const stateMap = new Map<string, { code: string; name: string }>();
    plants.forEach((plant) => {
      if (!stateMap.has(plant.stateCode)) {
        stateMap.set(plant.stateCode, {
          code: plant.stateCode,
          name: plant.stateCode, // Can be enhanced with full state names
        });
      }
    });

    // Step 1: Upsert states
    console.log("Step 1: Upserting states...");
    const stateIdMap = new Map<string, number>();

    for (const [code, stateData] of stateMap.entries()) {
      const state = await prisma.state.upsert({
        where: { code },
        update: {},
        create: stateData,
      });
      stateIdMap.set(code, state.id);
    }
    console.log(`✓ Upserted ${stateIdMap.size} states\n`);

    // Step 2: Upsert plants and plant generations
    console.log("Step 2: Upserting plants and generations...");
    let plantCount = 0;
    let generationCount = 0;
    const defaultYear = 2021;

    for (const plant of plants) {
      const stateId = stateIdMap.get(plant.stateCode);
      if (!stateId) {
        console.warn(`⚠️  State not found for: ${plant.stateCode}`);
        continue;
      }

      const year = plant.year || defaultYear;

      // Upsert plant
      const dbPlant = await prisma.plant.upsert({
        where: {
          name_stateId: {
            name: plant.plantName,
            stateId,
          },
        },
        update: {},
        create: {
          name: plant.plantName,
          stateId,
        },
      });
      plantCount++;

      // Upsert plant generation
      await prisma.plantGeneration.upsert({
        where: {
          plantId_year: {
            plantId: dbPlant.id,
            year,
          },
        },
        update: {
          netGeneration: plant.netGeneration,
        },
        create: {
          plantId: dbPlant.id,
          year,
          netGeneration: plant.netGeneration,
        },
      });
      generationCount++;

      // Log progress every 100 plants
      if (plantCount % 100 === 0) {
        console.log(`  Processed ${plantCount} plants...`);
      }
    }

    console.log(`✓ Upserted ${plantCount} plants`);
    console.log(`✓ Upserted ${generationCount} generation records\n`);

    // Step 3: Compute state totals (aggregate to StateGeneration table)
    console.log("Step 3: Computing state generation totals...");
    await computeStateGenerationTotals();

    // Step 4: Display summary
    console.log("\n📈 Database Summary:");
    const finalStateCount = await prisma.state.count();
    const finalPlantCount = await prisma.plant.count();
    const finalGenerationCount = await prisma.plantGeneration.count();
    const finalStateGenerationCount = await prisma.stateGeneration.count();

    console.log(`  States: ${finalStateCount}`);
    console.log(`  Plants: ${finalPlantCount}`);
    console.log(`  Plant Generations: ${finalGenerationCount}`);
    console.log(`  State Generations: ${finalStateGenerationCount}`);

    console.log("\n✅ Seed completed successfully!");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    throw error;
  }
}

/**
 * Compute state generation totals by aggregating plant generations
 */
async function computeStateGenerationTotals() {
  // Get all distinct (stateId, year) combinations
  const combinations = await prisma.$queryRaw<
    Array<{ state_id: number; year: number }>
  >`
    SELECT DISTINCT p.state_id, pg.year
    FROM plant_generations pg
    JOIN plants p ON p.id = pg.plant_id
    ORDER BY p.state_id, pg.year
  `;

  console.log(
    `  Found ${combinations.length} state-year combinations to aggregate`
  );

  for (const combo of combinations) {
    // Aggregate total generation for this state and year
    const result = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT SUM(pg.net_generation) as total
      FROM plant_generations pg
      JOIN plants p ON p.id = pg.plant_id
      WHERE p.state_id = ${combo.state_id}
        AND pg.year = ${combo.year}
    `;

    const totalGeneration = result[0]?.total || BigInt(0);

    // Upsert state generation record
    await prisma.stateGeneration.upsert({
      where: {
        stateId_year: {
          stateId: combo.state_id,
          year: combo.year,
        },
      },
      update: {
        totalGeneration: Number(totalGeneration),
      },
      create: {
        stateId: combo.state_id,
        year: combo.year,
        totalGeneration: Number(totalGeneration),
      },
    });
  }

  console.log(`✓ Computed ${combinations.length} state generation totals`);
}

/**
 * Seed sample data for testing when no JSON export exists
 */
async function seedSampleData() {
  console.log("🌱 Seeding sample data...\n");

  // Get year from environment variable or use default
  const seedYear = parseInt(process.env.TEST_SEED_YEAR || "2023", 10);
  console.log(`📅 Using seed year: ${seedYear}\n`);

  // Create sample states
  const states = [
    { code: "TX", name: "Texas" },
    { code: "CA", name: "California" },
    { code: "FL", name: "Florida" },
  ];

  console.log("Step 1: Creating sample states...");
  const stateIdMap = new Map<string, number>();

  for (const stateData of states) {
    const state = await prisma.state.upsert({
      where: { code: stateData.code },
      update: {},
      create: stateData,
    });
    stateIdMap.set(stateData.code, state.id);
  }
  console.log(`✓ Created ${states.length} states\n`);

  // Create sample plants
  console.log("Step 2: Creating sample plants and generations...");
  const samplePlants = [
    {
      name: "South Texas Project",
      stateCode: "TX",
      netGeneration: 21787144,
      year: seedYear,
    },
    {
      name: "Comanche Peak",
      stateCode: "TX",
      netGeneration: 18653890,
      year: seedYear,
    },
    {
      name: "Diablo Canyon",
      stateCode: "CA",
      netGeneration: 17892234,
      year: seedYear,
    },
    {
      name: "Palo Verde",
      stateCode: "CA",
      netGeneration: 31522590,
      year: seedYear,
    },
    {
      name: "Turkey Point",
      stateCode: "FL",
      netGeneration: 20061348,
      year: seedYear,
    },
  ];

  for (const plant of samplePlants) {
    const stateId = stateIdMap.get(plant.stateCode);
    if (!stateId) continue;

    const dbPlant = await prisma.plant.create({
      data: {
        name: plant.name,
        stateId,
      },
    });

    await prisma.plantGeneration.create({
      data: {
        plantId: dbPlant.id,
        year: plant.year,
        netGeneration: plant.netGeneration,
      },
    });
  }
  console.log(`✓ Created ${samplePlants.length} plants with generations\n`);

  // Compute state totals
  console.log("Step 3: Computing state generation totals...");
  await computeStateGenerationTotals();

  console.log("\n✅ Sample seed completed successfully!");
}

/**
 * Main function
 */
async function main() {
  await seed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
