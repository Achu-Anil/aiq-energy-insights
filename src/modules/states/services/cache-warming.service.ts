import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "ioredis";
import { StateRepository } from "../repositories/state.repository";

/**
 * Cache warming service
 * Responsible for pre-loading frequently accessed data into Redis cache
 * This improves response times by ensuring hot data is always cached
 */
@Injectable()
export class CacheWarmingService {
  private readonly logger = new Logger(CacheWarmingService.name);
  private readonly CONCURRENCY_LIMIT = 10; // Warm 10 states at a time

  constructor(
    private readonly redis: Redis,
    private readonly stateRepository: StateRepository
  ) {}

  /**
   * Warm up cache with hot payloads for all states
   * This should be called after data ingestion to pre-populate the cache
   *
   * @returns Number of states warmed
   */
  async warmAllStates(): Promise<number> {
    this.logger.log("Starting cache warming for all states...");
    const startTime = Date.now();

    try {
      // Get all states
      const states = await this.stateRepository.findAll();
      this.logger.log(`Found ${states.length} states to warm`);

      if (states.length === 0) {
        this.logger.warn("No states found to warm");
        return 0;
      }

      // Warm cache in parallel batches to avoid overwhelming the system
      let warmedCount = 0;

      for (let i = 0; i < states.length; i += this.CONCURRENCY_LIMIT) {
        const batch = states.slice(i, i + this.CONCURRENCY_LIMIT);

        await Promise.all(
          batch.map(
            async (state: { code: string; id: number; name: string }) => {
              try {
                await this.warmStateCache(state.code);
                warmedCount++;
              } catch (error) {
                this.logger.error(`Failed to warm state ${state.code}:`, error);
              }
            }
          )
        );

        this.logger.debug(
          `Warmed ${Math.min(i + this.CONCURRENCY_LIMIT, states.length)}/${
            states.length
          } states`
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Cache warming completed for ${warmedCount}/${states.length} states in ${duration}ms`
      );

      return warmedCount;
    } catch (error) {
      this.logger.error("Cache warming failed:", error);
      throw error;
    }
  }

  /**
   * Warm cache for a specific state
   * Fetches and caches all commonly accessed data for the state
   *
   * @param stateCode - The state code to warm (e.g., "TX", "CA")
   */
  async warmStateCache(stateCode: string): Promise<void> {
    this.logger.debug(`Warming cache for state: ${stateCode}`);

    try {
      // Fetch and cache state details
      // This will populate: state:{code}
      await this.stateRepository.findByCode(stateCode);

      // Fetch and cache state generation data (all years)
      // This will populate: state:{code}:generation:all
      await this.stateRepository.getGenerationByState(stateCode);

      // Fetch and cache state statistics
      // This will populate: state:{code}:statistics
      await this.stateRepository.getStateStatistics(stateCode);

      // Fetch and cache top plants for state (top 10)
      // This will populate: state:{code}:top-plants:all:10
      await this.stateRepository.getTopPlantsByState(stateCode, 10);

      // Also cache top 20 for states that might need more data
      await this.stateRepository.getTopPlantsByState(stateCode, 20);

      this.logger.debug(`Successfully warmed cache for state: ${stateCode}`);
    } catch (error) {
      this.logger.warn(`Failed to warm cache for state ${stateCode}:`, error);
      // Don't throw - we want to continue warming other states
    }
  }

  /**
   * Warm cache for specific years
   * Pre-loads generation statistics for given years
   *
   * @param years - Array of years to warm
   * @returns Number of years successfully warmed
   */
  async warmYearData(years: number[]): Promise<number> {
    this.logger.log(`Warming cache for years: ${years.join(", ")}`);
    let warmedCount = 0;

    await Promise.all(
      years.map(async (year) => {
        try {
          // Fetch and cache year statistics
          // This will populate: states:generation:year:{year}
          await this.stateRepository.getGenerationByYear(year);
          warmedCount++;
          this.logger.debug(`Warmed cache for year: ${year}`);
        } catch (error) {
          this.logger.warn(`Failed to warm cache for year ${year}:`, error);
        }
      })
    );

    this.logger.log(`Successfully warmed ${warmedCount}/${years.length} years`);
    return warmedCount;
  }

  /**
   * Warm cache for a specific state and year combination
   * More granular warming for specific queries
   *
   * @param stateCode - State code
   * @param year - Year to warm
   */
  async warmStateYear(stateCode: string, year: number): Promise<void> {
    this.logger.debug(`Warming cache for ${stateCode} year ${year}`);

    try {
      // Fetch and cache generation data for specific year
      await this.stateRepository.getGenerationByState(stateCode, year);

      // Fetch and cache top plants for specific year
      await this.stateRepository.getTopPlantsByState(stateCode, 10, year);

      this.logger.debug(
        `Successfully warmed cache for ${stateCode} year ${year}`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to warm cache for ${stateCode} year ${year}:`,
        error
      );
    }
  }

  /**
   * Warm recent years (useful for time-series data)
   * @param count - Number of recent years to warm (default: 5)
   */
  async warmRecentYears(count: number = 5): Promise<void> {
    this.logger.log(`Warming cache for ${count} most recent years`);

    try {
      // Get distinct years from the database
      const result = await this.stateRepository["prisma"].$queryRaw<
        Array<{ year: number }>
      >`
        SELECT DISTINCT year 
        FROM plant_generations 
        ORDER BY year DESC 
        LIMIT ${count}
      `;

      const years = result.map((r) => r.year);

      if (years.length > 0) {
        await this.warmYearData(years);
      } else {
        this.logger.warn("No years found to warm");
      }
    } catch (error) {
      this.logger.error("Failed to warm recent years:", error);
      throw error;
    }
  }

  /**
   * Get warming statistics
   * @returns Cache warming metrics
   */
  async getWarmingStats(): Promise<{
    totalKeys: number;
    memoryUsage: number;
    isConnected: boolean;
  }> {
    try {
      const totalKeys = await this.redis.dbsize();
      const memoryInfo = await this.redis.info("memory");
      const memoryMatch = memoryInfo.match(/used_memory:(\d+)/);
      const memoryUsage =
        memoryMatch && memoryMatch[1] ? parseInt(memoryMatch[1], 10) : 0;

      await this.redis.ping();
      const isConnected = true;

      return {
        totalKeys,
        memoryUsage,
        isConnected,
      };
    } catch (error) {
      this.logger.error("Failed to get warming stats:", error);
      return {
        totalKeys: 0,
        memoryUsage: 0,
        isConnected: false,
      };
    }
  }
}
