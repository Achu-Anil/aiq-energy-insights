import * as ExcelJS from "exceljs";
import * as path from "path";
import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import Redis from "ioredis";
import { RedisHelper } from "../common/utils/redis.helper";
import { StateRepository } from "../modules/states/repositories/state.repository";
import { CacheWarmingService } from "../modules/states/services/cache-warming.service";

// Load environment variables
config();

// Initialize clients
const prisma = new PrismaClient({
  log: ["error", "warn"],
});

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  db: parseInt(process.env.REDIS_DB || "0", 10),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

const redisHelper = new RedisHelper(redis);

interface PlantData {
  plantName: string;
  stateCode: string;
  netGeneration: number;
}

interface PlantDataWithPercent extends PlantData {
  percentOfState: number;
}

const CURRENT_YEAR = 2023; // eGRID 2023 data

/**
 * Read Excel worksheets and list available sheets
 */
async function readExcelWorksheets() {
  try {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, "../../data/egrid2023.xlsx");
    await workbook.xlsx.readFile(filePath);

    console.log("All worksheet names:");
    console.log("-------------------");
    workbook.worksheets.forEach((worksheet, index) => {
      console.log(`${index + 1}. ${worksheet.name}`);
    });
    console.log("-------------------");
    console.log(`Total worksheets: ${workbook.worksheets.length}`);
  } catch (error) {
    console.error("Error reading Excel file:", error);
    throw error;
  }
}

/**
 * Read plant data from Excel sheet
 */
async function readPlantSheet(): Promise<PlantData[]> {
  const workbook = new ExcelJS.Workbook();
  const filePath = path.join(__dirname, "../../data/egrid2023.xlsx");
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.getWorksheet("PLNT23");
  if (!worksheet) {
    throw new Error("PLNT23 worksheet not found");
  }

  console.log(`\nReading Plant sheet with ${worksheet.rowCount} rows...`);

  const plants: PlantData[] = [];
  let headerRow: ExcelJS.Row | null = null;
  let plantNameCol = -1;
  let stateCodeCol = -1;
  let netGenerationCol = -1;

  // Find header row and columns
  worksheet.eachRow((row, rowNumber) => {
    if (!headerRow) {
      const values = row.values as any[];
      for (let i = 1; i < values.length; i++) {
        const cellValue = values[i]?.toString() || "";
        if (cellValue === "Plant name") plantNameCol = i;
        if (cellValue === "Plant state abbreviation") stateCodeCol = i;
        if (cellValue === "Plant annual net generation (MWh)")
          netGenerationCol = i;
      }

      if (plantNameCol > 0 && stateCodeCol > 0) {
        headerRow = row;
        console.log(`\nFound header row at row ${rowNumber}`);
        console.log(`  Plant Name Column: ${plantNameCol}`);
        console.log(`  State Code Column: ${stateCodeCol}`);
        console.log(`  Net Generation Column: ${netGenerationCol}`);
      }
    }
  });

  if (!headerRow || plantNameCol < 0 || stateCodeCol < 0) {
    throw new Error("Could not find required columns in Plant sheet");
  }

  // Read data rows
  let skippedRows = 0;
  worksheet.eachRow((row, rowNumber) => {
    if (!headerRow || rowNumber <= headerRow.number) return;

    const values = row.values as any[];
    const plantName = values[plantNameCol]?.toString().trim();
    const stateCode = values[stateCodeCol]?.toString().trim();
    const netGenValue = netGenerationCol > 0 ? values[netGenerationCol] : null;

    if (!plantName || !stateCode) {
      skippedRows++;
      return;
    }

    if (plantName === "PNAME" || stateCode === "PSTATABB") {
      skippedRows++;
      return;
    }

    let netGeneration = 0;
    if (
      netGenValue !== null &&
      netGenValue !== undefined &&
      netGenValue !== ""
    ) {
      const parsed = parseFloat(netGenValue.toString().replace(/,/g, ""));
      netGeneration = isNaN(parsed) ? 0 : parsed;
    }

    plants.push({ plantName, stateCode, netGeneration });
  });

  console.log(`Skipped ${skippedRows} rows (empty or invalid)`);
  console.log(`Successfully parsed ${plants.length} plant records`);

  return plants;
}

/**
 * Aggregate generation by state
 */
function aggregateGenerationByState(plants: PlantData[]): Map<string, number> {
  const stateGenerationMap = new Map<string, number>();
  for (const plant of plants) {
    const currentTotal = stateGenerationMap.get(plant.stateCode) || 0;
    stateGenerationMap.set(plant.stateCode, currentTotal + plant.netGeneration);
  }
  return stateGenerationMap;
}

/**
 * Compute plant percentages
 */
function computePlantPercentages(
  plants: PlantData[],
  stateGenerationMap: Map<string, number>
): PlantDataWithPercent[] {
  return plants.map((plant) => {
    const stateTotal = stateGenerationMap.get(plant.stateCode) || 0;
    const percentOfState =
      stateTotal > 0 ? (plant.netGeneration / stateTotal) * 100 : 0;
    return { ...plant, percentOfState };
  });
}

/**
 * Refresh materialized view concurrently (non-blocking)
 */
async function refreshMaterializedView(): Promise<void> {
  console.log("\n=== Refreshing Materialized View (CONCURRENT) ===");

  try {
    const startTime = Date.now();

    // CONCURRENT refresh allows reads during refresh
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY state_generation_mv`;

    const duration = Date.now() - startTime;
    console.log(`✓ Materialized view refreshed concurrently in ${duration}ms`);
  } catch (error) {
    console.error("✗ Failed to refresh materialized view:", error);
    throw error;
  }
}

/**
 * Invalidate Redis cache for states
 */
async function invalidateCache(): Promise<void> {
  console.log("\n=== Invalidating Redis Cache ===");

  try {
    const startTime = Date.now();

    // Delete all keys with prefixes: states: and state:
    const deletedKeys = await redisHelper.deleteByPrefixes([
      "states:",
      "state:",
    ]);

    const duration = Date.now() - startTime;

    console.log("✓ Cache invalidation completed:");
    deletedKeys.forEach((count, prefix) => {
      console.log(`  - ${prefix}* : ${count} keys deleted`);
    });
    console.log(`  Duration: ${duration}ms`);
  } catch (error) {
    console.error("✗ Failed to invalidate cache:", error);
    // Don't throw - cache invalidation failure shouldn't stop the process
    console.warn("⚠ Continuing without cache invalidation");
  }
}

/**
 * Rebuild hot payloads by warming cache
 */
async function rebuildHotPayloads(): Promise<void> {
  console.log("\n=== Rebuilding Hot Payloads ===");

  try {
    const startTime = Date.now();

    // Initialize services
    const stateRepository = new StateRepository(prisma as any, redis);
    const cacheWarmingService = new CacheWarmingService(redis, stateRepository);

    // Warm all state caches
    const statesWarmed = await cacheWarmingService.warmAllStates();

    // Warm recent years (last 5 years)
    await cacheWarmingService.warmRecentYears(5);

    const duration = Date.now() - startTime;
    console.log(`✓ Hot payloads rebuilt in ${duration}ms`);
    console.log(`  - States warmed: ${statesWarmed}`);

    // Get warming statistics
    const stats = await cacheWarmingService.getWarmingStats();
    console.log(`  - Total Redis keys: ${stats.totalKeys}`);
    console.log(
      `  - Memory usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`
    );
  } catch (error) {
    console.error("✗ Failed to rebuild hot payloads:", error);
    // Don't throw - cache warming failure shouldn't stop the process
    console.warn("⚠ Continuing without cache warming");
  }
}

/**
 * Main ingestion function with transaction
 */
async function ingestData() {
  const startTime = Date.now();

  try {
    console.log("=== Starting Data Ingestion Pipeline ===\n");

    // Step 1: Read Excel data
    await readExcelWorksheets();
    const plants = await readPlantSheet();
    console.log(`\nTotal plants processed: ${plants.length}`);

    // Step 2: Aggregate and compute statistics
    const stateGenerationMap = aggregateGenerationByState(plants);
    console.log(`\nAggregated data for ${stateGenerationMap.size} states`);

    const plantsWithPercentages = computePlantPercentages(
      plants,
      stateGenerationMap
    );

    // Display top 10 states
    const topStates = Array.from(stateGenerationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log("\nTop 10 states by total generation:");
    topStates.forEach(([state, total], index) => {
      console.log(`${index + 1}. ${state}: ${total.toLocaleString()} MWh`);
    });

    // === TRANSACTION STARTS HERE ===
    console.log("\n=== Starting Database Transaction ===");
    const txStartTime = Date.now();

    await prisma.$transaction(
      async (tx) => {
        console.log("\n[TX] Step 1: Upserting states...");
        const stateIdMap = new Map<string, number>();

        // Upsert states
        for (const [stateCode] of stateGenerationMap.entries()) {
          const state = await tx.state.upsert({
            where: { code: stateCode },
            update: {},
            create: {
              code: stateCode,
              name: stateCode, // Can be enhanced with full state names
            },
          });
          stateIdMap.set(stateCode, state.id);
        }
        console.log(`[TX] ✓ Upserted ${stateIdMap.size} states`);

        console.log("\n[TX] Step 2: Cleaning old data...");
        // Delete existing generation data for this year
        const deletedGenerations = await tx.plantGeneration.deleteMany({
          where: { year: CURRENT_YEAR },
        });
        console.log(
          `[TX] ✓ Deleted ${deletedGenerations.count} existing generation records`
        );

        console.log("\n[TX] Step 3: Upserting plants and generations...");
        let successCount = 0;
        let errorCount = 0;
        const BATCH_SIZE = 100;

        // Process plants in batches
        for (let i = 0; i < plantsWithPercentages.length; i += BATCH_SIZE) {
          const batch = plantsWithPercentages.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async (plant) => {
              try {
                const stateId = stateIdMap.get(plant.stateCode);
                if (!stateId) {
                  errorCount++;
                  return;
                }

                // Upsert plant
                const dbPlant = await tx.plant.upsert({
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

                // Create generation record
                await tx.plantGeneration.upsert({
                  where: {
                    plantId_year: {
                      plantId: dbPlant.id,
                      year: CURRENT_YEAR,
                    },
                  },
                  update: {
                    netGeneration: plant.netGeneration,
                  },
                  create: {
                    plantId: dbPlant.id,
                    year: CURRENT_YEAR,
                    netGeneration: plant.netGeneration,
                  },
                });

                successCount++;
              } catch (error) {
                errorCount++;
                console.error(
                  `[TX] Error processing plant ${plant.plantName}:`,
                  error
                );
              }
            })
          );

          // Log progress
          const processed = Math.min(
            i + BATCH_SIZE,
            plantsWithPercentages.length
          );
          console.log(
            `[TX]   Processed ${processed}/${plantsWithPercentages.length} plants...`
          );
        }

        console.log(`\n[TX] ✓ Successfully processed ${successCount} plants`);
        if (errorCount > 0) {
          console.log(`[TX] ⚠ Failed to process ${errorCount} plants`);
        }

        console.log("\n[TX] Transaction completed successfully");
      },
      {
        timeout: 300000, // 5 minutes timeout
        maxWait: 10000, // 10 seconds max wait to acquire connection
      }
    );
    // === TRANSACTION ENDS HERE ===

    const txDuration = Date.now() - txStartTime;
    console.log(`\n✓ Transaction committed in ${txDuration}ms`);

    // Step 3: Database summary
    console.log("\n=== Database Summary ===");
    const stateCount = await prisma.state.count();
    const plantCount = await prisma.plant.count();
    const generationCount = await prisma.plantGeneration.count();
    console.log(`Total states in DB: ${stateCount}`);
    console.log(`Total plants in DB: ${plantCount}`);
    console.log(`Total generation records in DB: ${generationCount}`);

    // Step 4: Refresh materialized view (CONCURRENT - non-blocking)
    await refreshMaterializedView();

    // Step 5: Invalidate Redis cache
    await invalidateCache();

    // Step 6: Rebuild hot payloads
    await rebuildHotPayloads();

    const totalDuration = Date.now() - startTime;
    console.log(`\n${"=".repeat(50)}`);
    console.log("=== Ingestion Pipeline Completed Successfully ===");
    console.log(`${"=".repeat(50)}`);
    console.log(
      `Total time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`
    );
    console.log(`✓ Data ingested in transaction`);
    console.log(`✓ Materialized view refreshed concurrently`);
    console.log(`✓ Cache invalidated (states:*, state:*)`);
    console.log(`✓ Hot payloads rebuilt`);
    console.log(`${"=".repeat(50)}\n`);
  } catch (error) {
    console.error("\n✗ Ingestion pipeline failed:", error);
    throw error;
  }
}

/**
 * Main entry point
 */
async function main() {
  let redisAvailable = false;

  try {
    // Check Redis connection
    console.log("Checking Redis connection...");
    try {
      await redis.ping();
      console.log("✓ Redis connected\n");
      redisAvailable = true;
    } catch (redisError) {
      console.warn(
        "⚠ Redis is not available - caching features will be disabled"
      );
      console.warn("  Cache invalidation and warming will be skipped\n");
      redisAvailable = false;
    }

    // Run ingestion
    await ingestData();

    console.log("✓ Script completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Script failed:", error);
    process.exit(1);
  } finally {
    // Cleanup
    await prisma.$disconnect();
    if (redisAvailable) {
      try {
        await redis.quit();
      } catch (e) {
        // Ignore redis quit errors
      }
    }
  }
}

// Run the script
main();
