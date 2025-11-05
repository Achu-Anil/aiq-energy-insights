import { Injectable, Logger, NotFoundException, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { GetPlantsQueryDto, PlantResponseDto } from "./dto/plants.dto";
import { PlantRepository } from "./repositories/plant.repository";
import { Redis } from "ioredis";

/**
 * PlantsService
 *
 * Business logic layer for plant operations
 * Orchestrates repository calls and data transformation
 */
@Injectable()
export class PlantsService {
  private readonly logger = new Logger(PlantsService.name);
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly plantRepository: PlantRepository,
    @Inject("REDIS_CLIENT") private readonly redis: Redis
  ) {}

  /**
   * Get top N plants by net generation
   *
   * @param query - Query parameters (top, state, year)
   * @returns Array of top plants with percentage calculations
   */
  async getTopPlants(query: GetPlantsQueryDto): Promise<PlantResponseDto[]> {
    const startTime = Date.now();

    try {
      // Generate cache key
      const cacheKey = `plants:top:${query.top || 10}:${query.state || "ALL"}:${
        query.year || "ALL"
      }`;

      // Try to get from cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }

      this.logger.log(
        `Cache miss for ${cacheKey}. Getting top ${
          query.top || 10
        } plants for state: ${query.state || "ALL"}, year: ${
          query.year || "ALL"
        }`
      );

      // Delegate to repository layer
      const options: any = {
        top: query.top || 10,
      };
      if (query.state) options.stateCode = query.state;
      if (query.year) options.year = query.year;

      const plants = await this.plantRepository.getTopNPlants(options);

      this.logger.log(
        `Retrieved ${plants.length} plants in ${Date.now() - startTime}ms`
      );

      const result = plants.map((plant, index) => ({
        id: plant.id,
        plantId: plant.plantId,
        name: plant.name,
        state: plant.state,
        year: plant.year,
        netGeneration: plant.netGeneration,
        percentOfState: plant.percentOfState,
        rank: index + 1,
      }));

      // Cache the result
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
      this.logger.log(
        `Cached result with key ${cacheKey} for ${this.CACHE_TTL}s`
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to get top plants: ${error}`);
      throw error;
    }
  }

  /**
   * Get individual plant by ID with generation history
   *
   * @param plantId - Plant ID
   * @returns Plant details with all generation records
   */
  async getPlantById(plantId: number) {
    const startTime = Date.now();

    try {
      // Generate cache key
      const cacheKey = `plant:${plantId}`;

      // Try to get from cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }

      this.logger.log(
        `Cache miss for ${cacheKey}. Getting plant details for ID: ${plantId}`
      );

      const plant = await this.plantRepository.getPlantById(plantId);

      if (!plant) {
        throw new NotFoundException(`Plant with ID ${plantId} not found`);
      }

      this.logger.log(
        `Retrieved plant ${plantId} in ${Date.now() - startTime}ms`
      );

      // Cache the result
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(plant));
      this.logger.log(
        `Cached result with key ${cacheKey} for ${this.CACHE_TTL}s`
      );

      return plant;
    } catch (error) {
      this.logger.error(`Failed to get plant by ID: ${error}`);
      throw error;
    }
  }
}
