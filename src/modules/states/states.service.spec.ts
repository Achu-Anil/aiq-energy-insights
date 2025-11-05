import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { StatesService } from "./states.service";
import { StateRepository } from "./repositories/state.repository";
import { PlantRepository } from "../plants/repositories/plant.repository";
import { PrismaService } from "../../prisma/prisma.service";
import { GetStatesQueryDto, GetStateDetailQueryDto } from "./dto/states.dto";

/**
 * Unit tests for StatesService
 *
 * Tests business logic for state operations
 * Ensures proper data transformation, ranking, and error handling
 */
describe("StatesService", () => {
  let service: StatesService;
  let plantRepository: jest.Mocked<PlantRepository>;
  let mockRedis: any;

  // Mock data fixtures
  const mockStatesSummary = [
    {
      stateId: 45,
      code: "TX",
      name: "Texas",
      year: 2023,
      totalGeneration: 544038647.08,
      percentOfNational: 12.98,
      plantCount: 824,
    },
    {
      stateId: 6,
      code: "CA",
      name: "California",
      year: 2023,
      totalGeneration: 212456789.0,
      percentOfNational: 5.07,
      plantCount: 345,
    },
  ];

  const mockStateDetail = {
    state: { id: 45, code: "TX", name: "Texas" },
    year: 2023,
    totalGeneration: 544038647.08,
    percentOfNational: 12.98,
    plantCount: 824,
    topPlants: [
      {
        id: 6,
        plantId: 6,
        name: "South Texas Project",
        year: 2023,
        netGeneration: 21787144,
        percentOfState: 4.0,
        rank: 1,
      },
    ],
  };

  beforeEach(async () => {
    const mockPlantRepo = {
      getTopNPlants: jest.fn(),
      getStatesSummary: jest.fn(),
      getStateDetail: jest.fn(),
      getPlantById: jest.fn(),
    };

    const mockStateRepo = {
      findAll: jest.fn(),
      findByCode: jest.fn(),
      getTotalGeneration: jest.fn(),
      getNationalTotal: jest.fn(),
    };

    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    mockRedis = {
      get: jest.fn().mockResolvedValue(null), // Default: cache miss
      set: jest.fn().mockResolvedValue("OK"),
      setex: jest.fn().mockResolvedValue("OK"),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatesService,
        {
          provide: PlantRepository,
          useValue: mockPlantRepo,
        },
        {
          provide: StateRepository,
          useValue: mockStateRepo,
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

    service = module.get<StatesService>(StatesService);
    plantRepository = module.get(PlantRepository);
    mockRedis = module.get("REDIS_CLIENT");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getStatesSummary", () => {
    it("should return states summary with default year (2023)", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 2023 };
      plantRepository.getStatesSummary.mockResolvedValue(mockStatesSummary);

      // Act
      const result = await service.getStatesSummary(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(plantRepository.getStatesSummary).toHaveBeenCalledWith({
        year: 2023,
      });
    });

    it("should add sequential ranks to states", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 2023 };
      plantRepository.getStatesSummary.mockResolvedValue(mockStatesSummary);

      // Act
      const result = await service.getStatesSummary(query);

      // Assert
      expect(result[0].rank).toBe(1);
      expect(result[0].code).toBe("TX");
      expect(result[1].rank).toBe(2);
      expect(result[1].code).toBe("CA");
    });

    it("should handle custom year parameter", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 2022 };
      const mockData = [{ ...mockStatesSummary[0], year: 2022 }];
      plantRepository.getStatesSummary.mockResolvedValue(mockData);

      // Act
      const result = await service.getStatesSummary(query);

      // Assert
      expect(result[0].year).toBe(2022);
      expect(plantRepository.getStatesSummary).toHaveBeenCalledWith({
        year: 2022,
      });
    });

    it("should return empty array when no data found", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 1900 };
      plantRepository.getStatesSummary.mockResolvedValue([]);

      // Act
      const result = await service.getStatesSummary(query);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should handle large number of states (50+)", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 2023 };
      const manyStates = Array.from({ length: 52 }, (_, i) => ({
        ...mockStatesSummary[0],
        stateId: i + 1,
        code: `S${i}`,
      }));
      plantRepository.getStatesSummary.mockResolvedValue(manyStates);

      // Act
      const result = await service.getStatesSummary(query);

      // Assert
      expect(result).toHaveLength(52);
      expect(result[0].rank).toBe(1);
      expect(result[51].rank).toBe(52);
    });

    it("should propagate repository errors", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 2023 };
      const error = new Error("Database connection failed");
      plantRepository.getStatesSummary.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getStatesSummary(query)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should return cached data on cache hit", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 2023 };
      const cachedData = JSON.stringify(mockStatesSummary);
      mockRedis.get.mockResolvedValueOnce(cachedData);

      // Act
      const result = await service.getStatesSummary(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(plantRepository.getStatesSummary).not.toHaveBeenCalled(); // Should not hit repository
    });
  });

  describe("getStateDetail", () => {
    it("should return state detail with default parameters", async () => {
      // Arrange
      const code = "TX";
      const query: GetStateDetailQueryDto = { year: 2023, topPlants: 10 };
      plantRepository.getStateDetail.mockResolvedValue(mockStateDetail);
      plantRepository.getTopNPlants.mockResolvedValue([
        {
          id: 6,
          plantId: 6,
          name: "South Texas Project",
          year: 2023,
          netGeneration: 21787144,
          percentOfState: 4.0,
          state: { id: 45, code: "TX", name: "Texas" },
        },
      ]);

      // Act
      const result = await service.getStateDetail(code, query);

      // Assert
      expect(result).toBeDefined();
      expect(plantRepository.getStateDetail).toHaveBeenCalledWith("TX", 2023);
      expect(plantRepository.getTopNPlants).toHaveBeenCalledWith({
        top: 10,
        stateCode: "TX",
        year: 2023,
      });
      expect(result.state.code).toBe("TX");
      expect(result.topPlants).toHaveLength(1);
    });

    it("should handle custom year parameter", async () => {
      // Arrange
      const code = "CA";
      const query: GetStateDetailQueryDto = { year: 2022, topPlants: 5 };
      const mockData = { ...mockStateDetail, year: 2022 };
      plantRepository.getStateDetail.mockResolvedValue(mockData);
      plantRepository.getTopNPlants.mockResolvedValue([]);

      // Act
      const result = await service.getStateDetail(code, query);

      // Assert
      expect(result.year).toBe(2022);
      expect(plantRepository.getStateDetail).toHaveBeenCalledWith("CA", 2022);
    });

    it("should throw NotFoundException for invalid state code", async () => {
      // Arrange
      const code = "XX";
      const query: GetStateDetailQueryDto = { year: 2023, topPlants: 10 };
      const error = new NotFoundException(`State with code 'XX' not found`);
      plantRepository.getStateDetail.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getStateDetail(code, query)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getStateDetail(code, query)).rejects.toThrow(
        "State with code 'XX' not found"
      );
    });

    it("should handle state with no plants", async () => {
      // Arrange
      const code = "WY";
      const query: GetStateDetailQueryDto = { year: 2023, topPlants: 10 };
      const emptyState = {
        ...mockStateDetail,
        state: { id: 50, code: "WY", name: "Wyoming" },
        topPlants: [],
        plantCount: 0,
      };
      plantRepository.getStateDetail.mockResolvedValue(emptyState);
      plantRepository.getTopNPlants.mockResolvedValue([]);

      // Act
      const result = await service.getStateDetail(code, query);

      // Assert
      expect(result.topPlants).toHaveLength(0);
      expect(result.plantCount).toBe(0);
    });

    it("should handle lowercase state codes", async () => {
      // Arrange
      const code = "tx";
      const query: GetStateDetailQueryDto = { year: 2023, topPlants: 10 };
      plantRepository.getStateDetail.mockResolvedValue(mockStateDetail);
      plantRepository.getTopNPlants.mockResolvedValue([]);

      // Act
      const result = await service.getStateDetail(code, query);

      // Assert
      // Service converts code to uppercase
      expect(plantRepository.getStateDetail).toHaveBeenCalledWith("TX", 2023);
      expect(plantRepository.getTopNPlants).toHaveBeenCalledWith({
        top: 10,
        stateCode: "TX",
        year: 2023,
      });
    });

    it("should include top plants with correct ranking", async () => {
      // Arrange
      const code = "TX";
      const query: GetStateDetailQueryDto = { year: 2023, topPlants: 3 };
      const detailWith3Plants = {
        ...mockStateDetail,
        topPlants: [
          { ...mockStateDetail.topPlants[0], rank: 1 },
          { ...mockStateDetail.topPlants[0], id: 7, rank: 2 },
          { ...mockStateDetail.topPlants[0], id: 8, rank: 3 },
        ],
      };
      plantRepository.getStateDetail.mockResolvedValue(detailWith3Plants);
      plantRepository.getTopNPlants.mockResolvedValue([
        {
          id: 6,
          plantId: 6,
          name: "South Texas Project",
          year: 2023,
          netGeneration: 21787144,
          percentOfState: 4.0,
          state: { id: 45, code: "TX", name: "Texas" },
        },
        {
          id: 7,
          plantId: 7,
          name: "Plant 2",
          year: 2023,
          netGeneration: 15000000,
          percentOfState: 2.8,
          state: { id: 45, code: "TX", name: "Texas" },
        },
        {
          id: 8,
          plantId: 8,
          name: "Plant 3",
          year: 2023,
          netGeneration: 10000000,
          percentOfState: 1.8,
          state: { id: 45, code: "TX", name: "Texas" },
        },
      ]);

      // Act
      const result = await service.getStateDetail(code, query);

      // Assert
      expect(result.topPlants).toHaveLength(3);
      expect(result.topPlants[0].rank).toBe(1);
      expect(result.topPlants[2].rank).toBe(3);
    });

    it("should return cached state detail on cache hit", async () => {
      // Arrange
      const code = "TX";
      const query: GetStateDetailQueryDto = { year: 2023, topPlants: 10 };
      const cachedData = JSON.stringify(mockStateDetail);
      mockRedis.get.mockResolvedValueOnce(cachedData);

      // Act
      const result = await service.getStateDetail(code, query);

      // Assert
      expect(result).toEqual(mockStateDetail);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(plantRepository.getStateDetail).not.toHaveBeenCalled(); // Should not hit repository
      expect(plantRepository.getTopNPlants).not.toHaveBeenCalled(); // Should not hit repository
    });
  });

  describe("edge cases", () => {
    it("should handle year boundaries (1900)", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 1900 };
      plantRepository.getStatesSummary.mockResolvedValue([]);

      // Act
      const result = await service.getStatesSummary(query);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle year boundaries (2100)", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 2100 };
      plantRepository.getStatesSummary.mockResolvedValue([]);

      // Act
      const result = await service.getStatesSummary(query);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle states with zero generation", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 2023 };
      const statesWithZero = [
        { ...mockStatesSummary[0], totalGeneration: 0, percentOfNational: 0 },
      ];
      plantRepository.getStatesSummary.mockResolvedValue(statesWithZero);

      // Act
      const result = await service.getStatesSummary(query);

      // Assert
      expect(result[0].totalGeneration).toBe(0);
      expect(result[0].percentOfNational).toBe(0);
    });

    it("should handle very large generation numbers", async () => {
      // Arrange
      const query: GetStatesQueryDto = { year: 2023 };
      const largeGen = [
        {
          ...mockStatesSummary[0],
          totalGeneration: 999999999999.99,
        },
      ];
      plantRepository.getStatesSummary.mockResolvedValue(largeGen);

      // Act
      const result = await service.getStatesSummary(query);

      // Assert
      expect(result[0].totalGeneration).toBe(999999999999.99);
    });
  });
});
