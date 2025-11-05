import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PlantsService } from "./plants.service";
import { PlantRepository } from "./repositories/plant.repository";
import { PrismaService } from "../../prisma/prisma.service";
import { GetPlantsQueryDto } from "./dto/plants.dto";

/**
 * Unit tests for PlantsService
 *
 * Tests business logic layer with mocked repository
 * Ensures proper orchestration, error handling, and data transformation
 */
describe("PlantsService", () => {
  let service: PlantsService;
  let plantRepository: jest.Mocked<PlantRepository>;
  let mockRedis: any;

  // Mock data fixtures
  const mockPlants = [
    {
      id: 1,
      plantId: 1,
      name: "Palo Verde",
      state: { id: 4, code: "AZ", name: "Arizona" },
      year: 2023,
      netGeneration: 31522590,
      percentOfState: 28.19,
      rank: 1,
    },
    {
      id: 2,
      plantId: 2,
      name: "Browns Ferry",
      state: { id: 1, code: "AL", name: "Alabama" },
      year: 2023,
      netGeneration: 30219345,
      percentOfState: 25.43,
      rank: 2,
    },
  ];

  const mockPlantDetail = {
    id: 1,
    name: "Palo Verde",
    stateId: 4,
    state: { id: 4, code: "AZ", name: "Arizona" },
    generations: [
      { id: 1, plantId: 1, year: 2023, netGeneration: "31522590" },
      { id: 2, plantId: 1, year: 2022, netGeneration: "30000000" },
    ],
  };

  beforeEach(async () => {
    // Create mock repository with jest.fn() for all methods
    const mockRepo = {
      getTopNPlants: jest.fn(),
      getStatesSummary: jest.fn(),
      getStateDetail: jest.fn(),
      getPlantById: jest.fn(),
    };

    // Create mock Prisma service
    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    // Create mock Redis client
    mockRedis = {
      get: jest.fn().mockResolvedValue(null), // Default: cache miss
      setex: jest.fn().mockResolvedValue("OK"),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlantsService,
        {
          provide: PlantRepository,
          useValue: mockRepo,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: "REDIS_CLIENT",
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<PlantsService>(PlantsService);
    plantRepository = module.get(PlantRepository);
    mockRedis = module.get("REDIS_CLIENT");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getTopPlants", () => {
    it("should return top plants with default parameters", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 10 };
      plantRepository.getTopNPlants.mockResolvedValue(mockPlants);

      // Act
      const result = await service.getTopPlants(query);

      // Assert
      expect(result).toEqual(mockPlants);
      expect(plantRepository.getTopNPlants).toHaveBeenCalledWith({
        top: 10,
        stateCode: undefined,
        year: undefined,
      });
      expect(plantRepository.getTopNPlants).toHaveBeenCalledTimes(1);
    });

    it("should handle custom top parameter", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 5 };
      plantRepository.getTopNPlants.mockResolvedValue(mockPlants.slice(0, 1));

      // Act
      const result = await service.getTopPlants(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(plantRepository.getTopNPlants).toHaveBeenCalledWith({
        top: 5,
        stateCode: undefined,
        year: undefined,
      });
    });

    it("should filter by state code", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 10, state: "AZ" };
      const azPlants = [mockPlants[0]];
      plantRepository.getTopNPlants.mockResolvedValue(azPlants);

      // Act
      const result = await service.getTopPlants(query);

      // Assert
      expect(result).toEqual(azPlants);
      expect(plantRepository.getTopNPlants).toHaveBeenCalledWith({
        top: 10,
        stateCode: "AZ",
        year: undefined,
      });
    });

    it("should filter by year", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 10, year: 2023 };
      plantRepository.getTopNPlants.mockResolvedValue(mockPlants);

      // Act
      const result = await service.getTopPlants(query);

      // Assert
      expect(result).toEqual(mockPlants);
      expect(plantRepository.getTopNPlants).toHaveBeenCalledWith({
        top: 10,
        stateCode: undefined,
        year: 2023,
      });
    });

    it("should handle state and year filters together", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 5, state: "TX", year: 2023 };
      plantRepository.getTopNPlants.mockResolvedValue([]);

      // Act
      const result = await service.getTopPlants(query);

      // Assert
      expect(result).toEqual([]);
      expect(plantRepository.getTopNPlants).toHaveBeenCalledWith({
        top: 5,
        stateCode: "TX",
        year: 2023,
      });
    });

    it("should return empty array when no plants found", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 10 };
      plantRepository.getTopNPlants.mockResolvedValue([]);

      // Act
      const result = await service.getTopPlants(query);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should propagate repository errors", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 10, state: "XX" };
      const error = new NotFoundException("State with code 'XX' not found");
      plantRepository.getTopNPlants.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getTopPlants(query)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getTopPlants(query)).rejects.toThrow(
        "State with code 'XX' not found"
      );
    });

    it("should handle database connection errors", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 10 };
      const dbError = new Error("Database connection failed");
      plantRepository.getTopNPlants.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.getTopPlants(query)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should return cached data on cache hit", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 10 };
      const cachedData = JSON.stringify(mockPlants);
      mockRedis.get.mockResolvedValueOnce(cachedData);

      // Act
      const result = await service.getTopPlants(query);

      // Assert
      expect(result).toEqual(mockPlants);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(plantRepository.getTopNPlants).not.toHaveBeenCalled(); // Should not hit repository
    });
  });

  describe("getPlantById", () => {
    it("should return plant details by ID", async () => {
      // Arrange
      const plantId = 1;
      plantRepository.getPlantById.mockResolvedValue(mockPlantDetail);

      // Act
      const result = await service.getPlantById(plantId);

      // Assert
      expect(result).toEqual(mockPlantDetail);
      expect(plantRepository.getPlantById).toHaveBeenCalledWith(plantId);
      expect(plantRepository.getPlantById).toHaveBeenCalledTimes(1);
    });

    it("should throw NotFoundException when plant does not exist", async () => {
      // Arrange
      const plantId = 99999;
      const error = new NotFoundException(`Plant with ID ${plantId} not found`);
      plantRepository.getPlantById.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getPlantById(plantId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getPlantById(plantId)).rejects.toThrow(
        `Plant with ID ${plantId} not found`
      );
    });

    it("should handle negative plant IDs", async () => {
      // Arrange
      const plantId = -1;
      const error = new NotFoundException(`Plant with ID ${plantId} not found`);
      plantRepository.getPlantById.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getPlantById(plantId)).rejects.toThrow(
        NotFoundException
      );
      expect(plantRepository.getPlantById).toHaveBeenCalledWith(-1);
    });

    it("should return plant with multiple generation records", async () => {
      // Arrange
      const plantId = 1;
      const plantWithHistory = {
        ...mockPlantDetail,
        generations: [
          { id: 1, plantId: 1, year: 2023, netGeneration: "31522590" },
          { id: 2, plantId: 1, year: 2022, netGeneration: "30000000" },
          { id: 3, plantId: 1, year: 2021, netGeneration: "29000000" },
        ],
      };
      plantRepository.getPlantById.mockResolvedValue(plantWithHistory);

      // Act
      const result = await service.getPlantById(plantId);

      // Assert
      expect(result.generations).toHaveLength(3);
      expect(result.generations[0].year).toBe(2023);
    });

    it("should return cached plant data on cache hit", async () => {
      // Arrange
      const plantId = 1;
      const cachedData = JSON.stringify(mockPlantDetail);
      mockRedis.get.mockResolvedValueOnce(cachedData);

      // Act
      const result = await service.getPlantById(plantId);

      // Assert
      expect(result).toEqual(mockPlantDetail);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(plantRepository.getPlantById).not.toHaveBeenCalled(); // Should not hit repository
    });

    it("should throw NotFoundException when repository returns null", async () => {
      // Arrange
      const plantId = 123;
      plantRepository.getPlantById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPlantById(plantId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getPlantById(plantId)).rejects.toThrow(
        `Plant with ID ${plantId} not found`
      );
    });
  });

  describe("edge cases", () => {
    it("should handle maximum top value (100)", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 100 };
      const manyPlants = Array.from({ length: 100 }, (_, i) => ({
        ...mockPlants[0],
        id: i + 1,
        rank: i + 1,
      }));
      plantRepository.getTopNPlants.mockResolvedValue(manyPlants);

      // Act
      const result = await service.getTopPlants(query);

      // Assert
      expect(result).toHaveLength(100);
      expect(plantRepository.getTopNPlants).toHaveBeenCalledWith({
        top: 100,
        stateCode: undefined,
        year: undefined,
      });
    });

    it("should handle minimum top value (1)", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 1 };
      plantRepository.getTopNPlants.mockResolvedValue([mockPlants[0]]);

      // Act
      const result = await service.getTopPlants(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].rank).toBe(1);
    });

    it("should handle year boundaries", async () => {
      // Arrange
      const query: GetPlantsQueryDto = { top: 10, year: 1900 };
      plantRepository.getTopNPlants.mockResolvedValue([]);

      // Act
      const result = await service.getTopPlants(query);

      // Assert
      expect(result).toEqual([]);
      expect(plantRepository.getTopNPlants).toHaveBeenCalledWith({
        top: 10,
        stateCode: undefined,
        year: 1900,
      });
    });
  });
});
