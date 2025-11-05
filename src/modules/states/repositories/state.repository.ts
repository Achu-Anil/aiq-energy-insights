import { Injectable, Logger, Inject } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { Redis } from "ioredis";
import { REDIS_CLIENT } from "../../../redis/redis.module";

/**
 * State repository with caching layer
 * Handles all state-related database operations with Redis caching
 */
@Injectable()
export class StateRepository {
  private readonly logger = new Logger(StateRepository.name);
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  /**
   * Find all states
   * @returns Array of all states with basic information
   */
  async findAll() {
    const cacheKey = "states:all";

    try {
      // Try to get from cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug("Cache hit for all states");
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn("Cache read failed, falling back to database", error);
    }

    // Fetch from database
    const states = await this.prisma.state.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    // Cache the result
    try {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(states));
      this.logger.debug("Cached all states");
    } catch (error) {
      this.logger.warn("Cache write failed", error);
    }

    return states;
  }

  /**
   * Find state by code
   * @param code - State code (e.g., "TX", "CA")
   * @returns State object or null
   */
  async findByCode(code: string) {
    const cacheKey = `state:${code}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for state: ${code}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Cache read failed for state ${code}`, error);
    }

    const state = await this.prisma.state.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            plants: true,
          },
        },
      },
    });

    if (state) {
      try {
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(state));
        this.logger.debug(`Cached state: ${code}`);
      } catch (error) {
        this.logger.warn(`Cache write failed for state ${code}`, error);
      }
    }

    return state;
  }

  /**
   * Get generation data by state
   * @param stateCode - State code
   * @param year - Optional year filter
   * @returns Generation data aggregated by year
   */
  async getGenerationByState(stateCode: string, year?: number) {
    const cacheKey = year
      ? `state:${stateCode}:generation:${year}`
      : `state:${stateCode}:generation:all`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for generation: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Cache read failed for ${cacheKey}`, error);
    }

    // Use the materialized view for better performance
    const data = await this.prisma.$queryRaw<
      Array<{ state_id: number; year: number; total_generation: number }>
    >`
      SELECT state_id, year, total_generation
      FROM state_generation_mv
      WHERE state_id = (SELECT id FROM states WHERE code = ${stateCode})
      ${
        year
          ? this.prisma.$queryRaw`AND year = ${year}`
          : this.prisma.$queryRaw``
      }
      ORDER BY year DESC
    `;

    try {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(data));
      this.logger.debug(`Cached generation data: ${cacheKey}`);
    } catch (error) {
      this.logger.warn(`Cache write failed for ${cacheKey}`, error);
    }

    return data;
  }

  /**
   * Get top plants by generation for a state
   * @param stateCode - State code
   * @param limit - Number of top plants to return
   * @param year - Optional year filter
   * @returns Array of top plants with generation data
   */
  async getTopPlantsByState(
    stateCode: string,
    limit: number = 10,
    year?: number
  ) {
    const cacheKey = year
      ? `state:${stateCode}:top-plants:${year}:${limit}`
      : `state:${stateCode}:top-plants:all:${limit}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for top plants: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Cache read failed for ${cacheKey}`, error);
    }

    const whereClause: any = {
      state: {
        code: stateCode,
      },
    };

    if (year) {
      whereClause.generations = {
        some: {
          year,
        },
      };
    }

    const plants = await this.prisma.plant.findMany({
      where: whereClause,
      include: {
        generations: {
          ...(year && { where: { year } }),
          orderBy: {
            netGeneration: "desc",
          },
          take: 1,
        },
        state: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        generations: {
          _count: "desc",
        },
      },
      take: limit,
    });

    try {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(plants));
      this.logger.debug(`Cached top plants: ${cacheKey}`);
    } catch (error) {
      this.logger.warn(`Cache write failed for ${cacheKey}`, error);
    }

    return plants;
  }

  /**
   * Get generation statistics for a specific year across all states
   * @param year - Year to query
   * @returns Array of states with their total generation
   */
  async getGenerationByYear(year: number) {
    const cacheKey = `states:generation:year:${year}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for year generation: ${year}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Cache read failed for year ${year}`, error);
    }

    const data = await this.prisma.$queryRaw<
      Array<{
        state_id: number;
        year: number;
        total_generation: number;
        state_code: string;
        state_name: string;
      }>
    >`
      SELECT 
        mv.state_id, 
        mv.year, 
        mv.total_generation,
        s.code as state_code,
        s.name as state_name
      FROM state_generation_mv mv
      JOIN states s ON s.id = mv.state_id
      WHERE mv.year = ${year}
      ORDER BY mv.total_generation DESC
    `;

    try {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(data));
      this.logger.debug(`Cached year generation: ${year}`);
    } catch (error) {
      this.logger.warn(`Cache write failed for year ${year}`, error);
    }

    return data;
  }

  /**
   * Get state statistics summary
   * @param stateCode - State code
   * @returns Summary statistics for the state
   */
  async getStateStatistics(stateCode: string) {
    const cacheKey = `state:${stateCode}:statistics`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for state statistics: ${stateCode}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Cache read failed for statistics ${stateCode}`, error);
    }

    const state = await this.prisma.state.findUnique({
      where: { code: stateCode },
      include: {
        _count: {
          select: {
            plants: true,
          },
        },
      },
    });

    if (!state) {
      return null;
    }

    // Get total generation from materialized view
    const generation = await this.prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT SUM(total_generation) as total
      FROM state_generation_mv
      WHERE state_id = ${state.id}
    `;

    const statistics = {
      state,
      totalPlants: state._count.plants,
      totalGeneration: generation[0]?.total || 0,
    };

    try {
      await this.redis.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(statistics)
      );
      this.logger.debug(`Cached state statistics: ${stateCode}`);
    } catch (error) {
      this.logger.warn(`Cache write failed for statistics ${stateCode}`, error);
    }

    return statistics;
  }
}
