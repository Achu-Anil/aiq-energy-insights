import * as ExcelJS from "exceljs";
import * as path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load environment variables
config();

const prisma = new PrismaClient();

interface PlantData {
  plantName: string;
  stateCode: string;
  netGeneration: number;
}

interface PlantDataWithPercent extends PlantData {
  percentOfState: number;
}

async function readExcelWorksheets() {
  try {
    // Create a new workbook instance
    const workbook = new ExcelJS.Workbook();

    // Read the Excel file
    const filePath = path.join(__dirname, "../../data/egrid2023.xlsx");
    await workbook.xlsx.readFile(filePath);

    console.log("All worksheet names:");
    console.log("-------------------");

    // Iterate through all worksheets and print their names
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

async function readPlantSheet(): Promise<PlantData[]> {
  try {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, "../../data/egrid2023.xlsx");
    await workbook.xlsx.readFile(filePath);

    // Get the 'PLNT23' worksheet (Plant sheet)
    const worksheet = workbook.getWorksheet("PLNT23");

    if (!worksheet) {
      throw new Error("PLNT23 worksheet not found");
    }

    console.log(`\nReading Plant sheet with ${worksheet.rowCount} rows...`);

    const plants: PlantData[] = [];
    let headerRow: ExcelJS.Row | null = null;
    let plantNameCol: number = -1;
    let stateCodeCol: number = -1;
    let netGenerationCol: number = -1;

    // Find header row and column indices
    worksheet.eachRow((row, rowNumber) => {
      if (!headerRow) {
        // Check if this row contains headers
        const values = row.values as any[];

        for (let i = 1; i < values.length; i++) {
          const cellValue = values[i]?.toString() || "";
          const upperCellValue = cellValue.toUpperCase();

          // Look for plant name column
          if (cellValue === "Plant name") {
            plantNameCol = i;
          }

          // Look for state abbreviation
          if (cellValue === "Plant state abbreviation") {
            stateCodeCol = i;
          }

          // Look for net generation
          if (cellValue === "Plant annual net generation (MWh)") {
            netGenerationCol = i;
          }
        }

        // If we found at least plant name and state columns, this is the header
        if (plantNameCol > 0 && stateCodeCol > 0) {
          headerRow = row;
          console.log(`\nFound header row at row ${rowNumber}`);
          console.log(`  Plant Name Column: ${plantNameCol}`);
          console.log(`  State Code Column: ${stateCodeCol}`);
          console.log(
            `  Net Generation Column: ${
              netGenerationCol > 0 ? netGenerationCol : "Not found"
            }`
          );
          return;
        }
      }
    });

    if (!headerRow || plantNameCol < 0 || stateCodeCol < 0) {
      throw new Error("Could not find required columns in Plant sheet");
    }

    // Read data rows
    let skippedRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      // Skip until we pass the header row
      if (!headerRow || rowNumber <= headerRow.number) {
        return;
      }

      const values = row.values as any[];
      const plantName = values[plantNameCol]?.toString().trim();
      const stateCode = values[stateCodeCol]?.toString().trim();
      const netGenValue =
        netGenerationCol > 0 ? values[netGenerationCol] : null;

      // Skip empty rows or rows without plant name and state
      if (!plantName || plantName === "" || !stateCode || stateCode === "") {
        skippedRows++;
        return;
      }

      // Skip secondary header rows
      if (plantName === "PNAME" || stateCode === "PSTATABB") {
        skippedRows++;
        return;
      }

      // Parse net generation (handle various formats)
      let netGeneration = 0;
      if (
        netGenValue !== null &&
        netGenValue !== undefined &&
        netGenValue !== ""
      ) {
        const parsed = parseFloat(netGenValue.toString().replace(/,/g, ""));
        netGeneration = isNaN(parsed) ? 0 : parsed;
      }

      plants.push({
        plantName,
        stateCode,
        netGeneration,
      });
    });

    console.log(`Skipped ${skippedRows} rows (empty or invalid)`);

    console.log(`\nSuccessfully parsed ${plants.length} plant records`);

    // Display first 10 records as sample
    if (plants.length > 0) {
      console.log("\nFirst 10 records:");
      plants.slice(0, 10).forEach((plant, index) => {
        console.log(
          `${index + 1}. ${plant.plantName} (${plant.stateCode}) - Net Gen: ${
            plant.netGeneration
          }`
        );
      });
    }

    return plants;
  } catch (error) {
    console.error("Error reading Plant sheet:", error);
    throw error;
  }
}

function aggregateGenerationByState(plants: PlantData[]): Map<string, number> {
  const stateGenerationMap = new Map<string, number>();

  for (const plant of plants) {
    const currentTotal = stateGenerationMap.get(plant.stateCode) || 0;
    stateGenerationMap.set(plant.stateCode, currentTotal + plant.netGeneration);
  }

  return stateGenerationMap;
}

function computePlantPercentages(
  plants: PlantData[],
  stateGenerationMap: Map<string, number>
): PlantDataWithPercent[] {
  return plants.map((plant) => {
    const stateTotal = stateGenerationMap.get(plant.stateCode) || 0;
    const percentOfState =
      stateTotal > 0 ? (plant.netGeneration / stateTotal) * 100 : 0;

    return {
      ...plant,
      percentOfState,
    };
  });
}

async function upsertStatesToDB(
  stateGenerationMap: Map<string, number>
): Promise<Map<string, number>> {
  console.log("\n=== Upserting States to Database ===");
  const stateIdMap = new Map<string, number>();

  for (const [stateCode] of stateGenerationMap.entries()) {
    // Upsert state (create if not exists)
    const state = await prisma.state.upsert({
      where: { code: stateCode },
      update: {},
      create: {
        code: stateCode,
        name: stateCode, // Using code as name for now, can be enhanced
      },
    });

    stateIdMap.set(stateCode, state.id);
  }

  console.log(`✓ Upserted ${stateIdMap.size} states`);
  return stateIdMap;
}

function logTop10PlantsByGeneration(plants: PlantDataWithPercent[]): void {
  console.log("\n=== Top 10 Plants by Net Generation ===");

  const topPlants = plants
    .sort((a, b) => b.netGeneration - a.netGeneration)
    .slice(0, 10);

  topPlants.forEach((plant, index) => {
    console.log(
      `${index + 1}. ${plant.plantName}` +
        `\n   State: ${plant.stateCode}` +
        `\n   Net Generation: ${plant.netGeneration.toLocaleString()} MWh` +
        `\n   Percentage of State: ${plant.percentOfState.toFixed(4)}%\n`
    );
  });
}

async function upsertPlantsToDB(
  plants: PlantDataWithPercent[],
  stateIdMap: Map<string, number>
): Promise<void> {
  console.log("\n=== Upserting Plants and Generations to Database ===");

  // Delete all existing plant generations and plants
  await prisma.plantGeneration.deleteMany({});
  console.log(`✓ Deleted existing plant generations`);

  const deleteResult = await prisma.plant.deleteMany({});
  console.log(`✓ Deleted ${deleteResult.count} existing plants`);

  let successCount = 0;
  let errorCount = 0;

  const currentYear = 2023; // eGRID 2023 data

  // Batch upsert plants with generations
  for (const plant of plants) {
    try {
      const stateId = stateIdMap.get(plant.stateCode);

      if (!stateId) {
        console.error(`Warning: State ID not found for ${plant.stateCode}`);
        errorCount++;
        continue;
      }

      // Create plant with its generation data
      await prisma.plant.create({
        data: {
          name: plant.plantName,
          stateId: stateId,
          generations: {
            create: {
              year: currentYear,
              netGeneration: plant.netGeneration,
            },
          },
        },
      });

      successCount++;

      // Log progress every 1000 plants
      if (successCount % 1000 === 0) {
        console.log(`  Processed ${successCount} plants...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`Error inserting plant ${plant.plantName}:`, error);
    }
  }

  console.log(
    `✓ Successfully inserted ${successCount} plants with generation data`
  );
  if (errorCount > 0) {
    console.log(`✗ Failed to insert ${errorCount} plants`);
  }
}

async function refreshMaterializedView(): Promise<void> {
  console.log("\n=== Refreshing Materialized View ===");

  try {
    const startTime = Date.now();

    // Use raw SQL to refresh the materialized view
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW state_generation_mv`;

    const duration = Date.now() - startTime;
    console.log(`✓ Materialized view refreshed successfully in ${duration}ms`);
  } catch (error) {
    console.error("✗ Failed to refresh materialized view:", error);
    throw error;
  }
}

// Execute the functions
async function main() {
  await readExcelWorksheets();
  const plants = await readPlantSheet();
  console.log(`\nTotal plants processed: ${plants.length}`);

  // Aggregate generation by state
  const stateGenerationMap = aggregateGenerationByState(plants);
  console.log(`\nAggregated data for ${stateGenerationMap.size} states`);

  // Display top 10 states by total generation
  const topStates = Array.from(stateGenerationMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log("\nTop 10 states by total generation:");
  topStates.forEach(([state, total], index) => {
    console.log(`${index + 1}. ${state}: ${total.toLocaleString()} MWh`);
  });

  // Compute percentages for each plant
  const plantsWithPercentages = computePlantPercentages(
    plants,
    stateGenerationMap
  );

  // Display sample plants with percentages
  console.log("\nSample plants with percentage of state total:");
  plantsWithPercentages.slice(0, 10).forEach((plant, index) => {
    console.log(
      `${index + 1}. ${plant.plantName} (${plant.stateCode}) - ` +
        `${plant.netGeneration.toLocaleString()} MWh - ` +
        `${plant.percentOfState.toFixed(4)}% of state`
    );
  });

  // Log top 10 plants by net generation
  logTop10PlantsByGeneration(plantsWithPercentages);

  // Upsert data to database
  const stateIdMap = await upsertStatesToDB(stateGenerationMap);
  await upsertPlantsToDB(plantsWithPercentages, stateIdMap);

  // Refresh materialized view once after all data is loaded
  await refreshMaterializedView();

  console.log("\n=== Database Summary ===");
  const stateCount = await prisma.state.count();
  const plantCount = await prisma.plant.count();
  const generationCount = await prisma.plantGeneration.count();
  console.log(`Total states in DB: ${stateCount}`);
  console.log(`Total plants in DB: ${plantCount}`);
  console.log(`Total generation records in DB: ${generationCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("\n✓ Script completed successfully");
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("✗ Script failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
