import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../prisma/prisma.service";
import { PlantRepository } from "./plant.repository";
import { NotFoundException } from "@nestjs/common";

/**
 * Integration tests for PlantRepository
 *
 * Tests repository layer with real database connection
 * Verifies complex queries, joins, and materialized view usage
 *
 * Prerequisites:
 * - Database must be running
 * - Migrations must be applied
 * - Seed data must be loaded
 */
describe("PlantRepository (Integration)", () => {
  let repository: PlantRepository;
  let prisma: PrismaService;
  const TEST_YEAR = parseInt(process.env.TEST_SEED_YEAR || "2023", 10);

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PlantRepository],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    repository = module.get<PlantRepository>(PlantRepository);

    // Verify database connection
    await prisma.$connect();

    // Sanity check: Verify seed data exists
    const stateCount = await prisma.state.count();
    const plantCount = await prisma.plant.count();

    if (stateCount === 0 || plantCount === 0) {
      throw new Error(
        `⚠️  TEST DATA MISSING IN DATABASE!\n` +
          `   States: ${stateCount}, Plants: ${plantCount}\n` +
          `   Did you forget to run: npm run db:seed:int?\n` +
          `   Or in CI: ensure seed step runs before tests`
      );
    }

    console.log(
      `✓ Database seed verified: ${stateCount} states, ${plantCount} plants`
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("getTopNPlants", () => {
    it("should return top 10 plants globally", async () => {
      // Act
      const result = await repository.getTopNPlants({ top: 10 });

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(10);

      if (result.length > 1) {
        // Verify DESC ordering
        expect(result[0]!.netGeneration).toBeGreaterThanOrEqual(
          result[1]!.netGeneration
        );
      }

      // Verify structure
      if (result.length > 0) {
        const plant = result[0]!;
        expect(plant).toHaveProperty("id");
        expect(plant).toHaveProperty("plantId");
        expect(plant).toHaveProperty("name");
        expect(plant).toHaveProperty("state");
        expect(plant).toHaveProperty("year");
        expect(plant).toHaveProperty("netGeneration");
        expect(plant).toHaveProperty("percentOfState");
        expect(plant).toHaveProperty("rank");
        expect(plant.rank).toBe(1);
      }
    });

    it("should return top 5 plants for specific state", async () => {
      // Act
      const result = await repository.getTopNPlants({
        top: 5,
        stateCode: "TX",
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5);

      // All plants should be from Texas
      result.forEach((plant) => {
        expect(plant.state.code).toBe("TX");
      });
    });

    it("should filter by year correctly", async () => {
      // Act
      const result = await repository.getTopNPlants({
        top: 10,
        year: TEST_YEAR,
      });

      // Assert
      expect(result).toBeDefined();
      result.forEach((plant) => {
        expect(plant.year).toBe(TEST_YEAR);
      });
    });

    it("should throw NotFoundException for invalid state code", async () => {
      // Act & Assert
      await expect(
        repository.getTopNPlants({ top: 10, stateCode: "XX" })
      ).rejects.toThrow(NotFoundException);
    });

    it("should calculate percentOfState correctly", async () => {
      // Act
      const result = await repository.getTopNPlants({
        top: 1,
        stateCode: "CA",
        year: TEST_YEAR,
      });

      // Assert
      if (result.length > 0) {
        const plant = result[0]!;
        expect(plant.percentOfState).toBeGreaterThan(0);
        expect(plant.percentOfState).toBeLessThanOrEqual(100);
        expect(typeof plant.percentOfState).toBe("number");
      }
    });

    it("should return empty array when no data for year", async () => {
      // Act
      const result = await repository.getTopNPlants({
        top: 10,
        year: 1900,
      });

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle top = 1 (single plant)", async () => {
      // Act
      const result = await repository.getTopNPlants({ top: 1 });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]!.rank).toBe(1);
    });

    it("should assign sequential ranks", async () => {
      // Act
      const result = await repository.getTopNPlants({ top: 5 });

      // Assert
      result.forEach((plant, index) => {
        expect(plant.rank).toBe(index + 1);
      });
    });
  });

  describe("getStatesSummary", () => {
    it("should return all states for given year", async () => {
      // Act
      const result = await repository.getStatesSummary({ year: TEST_YEAR });

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Verify structure
      if (result.length > 0) {
        const state = result[0]!;
        expect(state).toHaveProperty("stateId");
        expect(state).toHaveProperty("code");
        expect(state).toHaveProperty("name");
        expect(state).toHaveProperty("year");
        expect(state).toHaveProperty("totalGeneration");
        expect(state).toHaveProperty("percentOfNational");
        expect(state).toHaveProperty("plantCount");
      }
    });

    it("should order states by total generation DESC", async () => {
      // Act
      const result = await repository.getStatesSummary({ year: TEST_YEAR });

      // Assert
      if (result.length > 1) {
        expect(result[0]!.totalGeneration).toBeGreaterThanOrEqual(
          result[1]!.totalGeneration
        );
      }
    });

    it("should calculate national percentages correctly", async () => {
      // Act
      const result = await repository.getStatesSummary({ year: TEST_YEAR });

      // Assert
      if (result.length > 0) {
        // Sum of all percentages should be ~100%
        const totalPercent = result.reduce(
          (sum, state) => sum + state.percentOfNational,
          0
        );
        expect(totalPercent).toBeGreaterThan(99);
        expect(totalPercent).toBeLessThan(101);

        // Each percentage should be valid
        result.forEach((state) => {
          expect(state.percentOfNational).toBeGreaterThanOrEqual(0);
          expect(state.percentOfNational).toBeLessThanOrEqual(100);
        });
      }
    });

    it("should return empty array for year with no data", async () => {
      // Act
      const result = await repository.getStatesSummary({ year: 1900 });

      // Assert
      expect(result).toEqual([]);
    });

    it("should include plant counts", async () => {
      // Act
      const result = await repository.getStatesSummary({ year: TEST_YEAR });

      // Assert
      result.forEach((state) => {
        expect(state.plantCount).toBeGreaterThanOrEqual(0);
        expect(typeof state.plantCount).toBe("number");
      });
    });
  });

  describe("getStateDetail", () => {
    it("should return detailed state information", async () => {
      // Act
      const result = await repository.getStateDetail("TX", TEST_YEAR);

      // Assert
      expect(result).toBeDefined();
      expect(result.state.code).toBe("TX");
      expect(result.year).toBe(TEST_YEAR);
      expect(result.totalGeneration).toBeGreaterThan(0);
      expect(result.percentOfNational).toBeGreaterThan(0);
      expect(result.topPlants).toBeDefined();
      expect(result.plantCount).toBeGreaterThan(0);
    });

    it("should throw NotFoundException for invalid state", async () => {
      // Act & Assert
      await expect(repository.getStateDetail("XX", TEST_YEAR)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw NotFoundException when no data for year", async () => {
      // Act & Assert
      await expect(repository.getStateDetail("TX", 1900)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should include top plants", async () => {
      // Act
      const result = await repository.getStateDetail("CA", TEST_YEAR);

      // Assert
      expect(result.topPlants).toBeDefined();
      expect(Array.isArray(result.topPlants)).toBe(true);

      if (result.topPlants.length > 0) {
        expect(result.topPlants[0]!.state.code).toBe("CA");
      }
    });
  });

  describe("getPlantById", () => {
    it("should return plant with generations", async () => {
      // First get a valid plant ID
      const topPlants = await repository.getTopNPlants({ top: 1 });

      if (topPlants.length === 0) {
        // Skip test if no data
        return;
      }

      const plantId = topPlants[0]!.plantId;

      // Act
      const result = await repository.getPlantById(plantId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(plantId);
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("state");
      expect(result).toHaveProperty("generations");
      expect(Array.isArray(result.generations)).toBe(true);
    });

    it("should throw NotFoundException for invalid plant ID", async () => {
      // Act & Assert
      await expect(repository.getPlantById(999999)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should order generations by year DESC", async () => {
      // First get a valid plant ID
      const topPlants = await repository.getTopNPlants({ top: 1 });

      if (topPlants.length === 0) {
        return;
      }

      const plantId = topPlants[0]!.plantId;

      // Act
      const result = await repository.getPlantById(plantId);

      // Assert
      if (result.generations.length > 1) {
        expect(result.generations[0]!.year).toBeGreaterThanOrEqual(
          result.generations[1]!.year
        );
      }
    });
  });

  describe("performance tests", () => {
    it("should execute top plants query in < 100ms", async () => {
      const start = Date.now();

      await repository.getTopNPlants({ top: 10, year: TEST_YEAR });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    }, 150);

    it("should execute states summary in < 150ms", async () => {
      const start = Date.now();

      await repository.getStatesSummary({ year: TEST_YEAR });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(150);
    }, 200);
  });
});
