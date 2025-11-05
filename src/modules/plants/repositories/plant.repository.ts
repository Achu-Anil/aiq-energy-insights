import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Plant data transfer object with computed fields
 */
export interface PlantWithGeneration {
  id: number;
  name: string;
  plantId: number;
  state: {
    id: number;
    code: string;
    name: string;
  };
  year: number;
  netGeneration: number;
  percentOfState: number;
  rank?: number;
}

/**
 * State summary with national percentage
 */
export interface StateSummary {
  stateId: number;
  code: string;
  name: string;
  year: number;
  totalGeneration: number;
  percentOfNational: number;
  plantCount: number;
}

/**
 * Query options for top N plants
 */
export interface GetTopNPlantsOptions {
  top: number;
  stateCode?: string;
  year?: number;
}

/**
 * Query options for states summary
 */
export interface GetStatesSummaryOptions {
  year: number;
}

/**
 * Plant repository with optimized query functions
 * Uses materialized view and proper indexes for performance
 */
@Injectable()
export class PlantRepository {
  private readonly logger = new Logger(PlantRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get top N plants by net generation with percentage of state total
   *
   * Performance optimizations:
   * - Uses DESC index on net_generation for fast ordering
   * - Queries materialized view for state totals (O(1) lookup)
   * - Single efficient query with joins
   * - Resolves state code to ID once
   *
   * @param options - Query parameters
   * @returns Array of top plants with computed percentages
   *
   * @example
   * // Top 10 plants nationwide for 2023
   * const plants = await plantRepo.getTopNPlants({ top: 10, year: 2023 });
   *
   * @example
   * // Top 5 plants in Texas for 2023
   * const plants = await plantRepo.getTopNPlants({ top: 5, stateCode: 'TX', year: 2023 });
   */
  async getTopNPlants(
    options: GetTopNPlantsOptions
  ): Promise<PlantWithGeneration[]> {
    const { top, stateCode, year } = options;
    const startTime = Date.now();

    this.logger.debug(
      `Fetching top ${top} plants${stateCode ? ` for state ${stateCode}` : ""}${
        year ? ` for year ${year}` : ""
      }`
    );

    // Step 1: Resolve state code to ID (if provided)
    let stateId: number | undefined;
    if (stateCode) {
      const state = await this.prisma.state.findUnique({
        where: { code: stateCode },
        select: { id: true },
      });

      if (!state) {
        throw new NotFoundException(`State with code '${stateCode}' not found`);
      }

      stateId = state.id;
      this.logger.debug(`Resolved state ${stateCode} to ID ${stateId}`);
    }

    // Step 2: Build efficient query with all data needed
    // Uses DESC index: idx_plant_gen_year_netgen_desc or idx_plant_gen_netgen_desc
    const whereClause: any = {};
    if (year) whereClause.year = year;
    if (stateId) whereClause.plant = { stateId };

    const plantGenerations = await this.prisma.plantGeneration.findMany({
      where: whereClause,
      orderBy: { netGeneration: "desc" },
      take: top,
      include: {
        plant: {
          include: {
            state: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (plantGenerations.length === 0) {
      this.logger.debug("No plants found matching criteria");
      return [];
    }

    // Step 3: Get state totals from materialized view for percentage calculation
    // This is O(N) where N = number of unique (state, year) combinations (usually small)
    const stateYearPairs = new Map<string, { stateId: number; year: number }>();
    plantGenerations.forEach((pg: any) => {
      const key = `${pg.plant.stateId}_${pg.year}`;
      if (!stateYearPairs.has(key)) {
        stateYearPairs.set(key, {
          stateId: pg.plant.stateId,
          year: pg.year,
        });
      }
    });

    // Fetch state totals - query all possible state/year combinations
    const stateTotals = await this.prisma.$queryRaw<
      Array<{ state_id: number; year: number; total_generation: string }>
    >`
      SELECT state_id, year, total_generation
      FROM state_generation_mv
    `;

    // Create lookup map for O(1) access
    const stateTotalMap = new Map<string, number>();
    stateTotals.forEach((st: any) => {
      const key = `${st.state_id}_${st.year}`;
      stateTotalMap.set(key, parseFloat(st.total_generation));
    });

    // Step 4: Compute percentages and format results
    const results: PlantWithGeneration[] = plantGenerations.map(
      (pg: any, index: number) => {
        const key = `${pg.plant.stateId}_${pg.year}`;
        const stateTotal = stateTotalMap.get(key) || 0;
        const netGen = parseFloat(pg.netGeneration.toString());
        const percentOfState = stateTotal > 0 ? (netGen / stateTotal) * 100 : 0;

        return {
          id: pg.id,
          plantId: pg.plant.id,
          name: pg.plant.name,
          state: pg.plant.state,
          year: pg.year,
          netGeneration: netGen,
          percentOfState,
          rank: index + 1,
        };
      }
    );

    const duration = Date.now() - startTime;
    this.logger.debug(
      `Fetched ${results.length} plants in ${duration}ms (avg: ${(
        duration / results.length
      ).toFixed(2)}ms per plant)`
    );

    return results;
  }

  /**
   * Get states summary with total generation and national percentage
   *
   * Performance optimizations:
   * - Uses materialized view for pre-aggregated totals
   * - Single query to compute national total
   * - Efficient calculation of percentages
   * - Includes plant count per state
   *
   * @param options - Query parameters
   * @returns Array of state summaries with percentages
   *
   * @example
   * // Get all states summary for 2023
   * const summary = await plantRepo.getStatesSummary({ year: 2023 });
   */
  async getStatesSummary(
    options: GetStatesSummaryOptions
  ): Promise<StateSummary[]> {
    const { year } = options;
    const startTime = Date.now();

    this.logger.debug(`Fetching states summary for year ${year}`);

    // Step 1: Get all state totals from materialized view
    // Uses index: idx_state_generation_mv_year_total
    const stateTotals = await this.prisma.$queryRaw<
      Array<{
        state_id: number;
        state_code: string;
        state_name: string;
        year: number;
        total_generation: string;
      }>
    >`
      SELECT 
        mv.state_id,
        s.code as state_code,
        s.name as state_name,
        mv.year,
        mv.total_generation
      FROM state_generation_mv mv
      JOIN states s ON s.id = mv.state_id
      WHERE mv.year = ${year}
      ORDER BY mv.total_generation DESC
    `;

    if (stateTotals.length === 0) {
      this.logger.debug(`No data found for year ${year}`);
      return [];
    }

    // Step 2: Calculate national total (single pass)
    const nationalTotal = stateTotals.reduce(
      (sum: number, st: any) => sum + parseFloat(st.total_generation),
      0
    );

    this.logger.debug(
      `National total for ${year}: ${nationalTotal.toLocaleString()} MWh`
    );

    // Step 3: Get plant counts per state (efficient group by)
    const plantCounts = await this.prisma.$queryRaw<
      Array<{ state_id: number; plant_count: bigint }>
    >`
      SELECT p.state_id, COUNT(DISTINCT p.id) as plant_count
      FROM plants p
      JOIN plant_generations pg ON pg.plant_id = p.id
      WHERE pg.year = ${year}
      GROUP BY p.state_id
    `;

    const plantCountMap = new Map<number, number>();
    plantCounts.forEach((pc: any) => {
      plantCountMap.set(pc.state_id, Number(pc.plant_count));
    });

    // Step 4: Format results with percentages
    const results: StateSummary[] = stateTotals.map((st: any) => {
      const totalGen = parseFloat(st.total_generation);
      const percentOfNational =
        nationalTotal > 0 ? (totalGen / nationalTotal) * 100 : 0;

      return {
        stateId: st.state_id,
        code: st.state_code,
        name: st.state_name,
        year: st.year,
        totalGeneration: totalGen,
        percentOfNational,
        plantCount: plantCountMap.get(st.state_id) || 0,
      };
    });

    const duration = Date.now() - startTime;
    this.logger.debug(
      `Fetched summary for ${results.length} states in ${duration}ms`
    );

    return results;
  }

  /**
   * Get detailed statistics for a specific state
   *
   * @param stateCode - State code (e.g., "TX", "CA")
   * @param year - Year to query
   * @returns State details with plants and rankings
   */
  async getStateDetail(stateCode: string, year: number) {
    const startTime = Date.now();

    // Resolve state
    const state = await this.prisma.state.findUnique({
      where: { code: stateCode },
    });

    if (!state) {
      throw new NotFoundException(`State with code '${stateCode}' not found`);
    }

    // Get state total from materialized view
    const stateTotal = await this.prisma.$queryRaw<
      Array<{ total_generation: string }>
    >`
      SELECT total_generation
      FROM state_generation_mv
      WHERE state_id = ${state.id} AND year = ${year}
    `;

    if (stateTotal.length === 0 || !stateTotal[0]) {
      throw new NotFoundException(
        `No data found for state '${stateCode}' in year ${year}`
      );
    }

    const totalGeneration = parseFloat(stateTotal[0].total_generation);

    // Get top plants for this state
    const topPlants = await this.getTopNPlants({
      top: 10,
      stateCode,
      year,
    });

    // Get national total for percentage
    const nationalData = await this.prisma.$queryRaw<
      Array<{ national_total: string }>
    >`
      SELECT SUM(total_generation) as national_total
      FROM state_generation_mv
      WHERE year = ${year}
    `;

    const nationalTotal = nationalData[0]
      ? parseFloat(nationalData[0].national_total)
      : 0;
    const percentOfNational =
      nationalTotal > 0 ? (totalGeneration / nationalTotal) * 100 : 0;

    // Get plant count
    const plantCount = await this.prisma.plant.count({
      where: {
        stateId: state.id,
        generations: {
          some: { year },
        },
      },
    });

    const duration = Date.now() - startTime;
    this.logger.debug(`Fetched state detail in ${duration}ms`);

    return {
      state,
      year,
      totalGeneration,
      percentOfNational,
      topPlants,
      plantCount,
    };
  }

  /**
   * Get plant by ID with generation history
   */
  async getPlantById(plantId: number) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: {
        state: true,
        generations: {
          orderBy: { year: "desc" },
        },
      },
    });

    if (!plant) {
      throw new NotFoundException(`Plant with ID ${plantId} not found`);
    }

    return plant;
  }
}
