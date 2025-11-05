import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  GetStatesQueryDto,
  GetStateDetailQueryDto,
  StateSummaryResponseDto,
  StateDetailResponseDto,
} from "./dto/states.dto";
import { StateRepository } from "./repositories/state.repository";
import { PlantRepository } from "../plants/repositories/plant.repository";

/**
 * StatesService
 *
 * Business logic layer for state operations
 * Orchestrates repository calls and data transformation
 */
@Injectable()
export class StatesService {
  private readonly logger = new Logger(StatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateRepository: StateRepository,
    private readonly plantRepository: PlantRepository
  ) {}

  /**
   * Get all states with generation summary
   *
   * @param query - Query parameters (year)
   * @returns Array of state summaries with totals and percentages
   */
  async getStatesSummary(
    query: GetStatesQueryDto
  ): Promise<StateSummaryResponseDto[]> {
    const startTime = Date.now();
    const year = query.year || 2023;

    try {
      this.logger.log(`Getting states summary for year: ${year}`);

      // Delegate to repository layer
      const states = await this.plantRepository.getStatesSummary({ year });

      this.logger.log(
        `Retrieved ${states.length} states in ${Date.now() - startTime}ms`
      );

      return states.map((state, index) => ({
        stateId: state.stateId,
        code: state.code,
        name: state.name,
        year: state.year,
        totalGeneration: state.totalGeneration,
        percentOfNational: state.percentOfNational,
        plantCount: state.plantCount,
        rank: index + 1,
      }));
    } catch (error) {
      this.logger.error(`Failed to get states summary: ${error}`);
      throw error;
    }
  }

  /**
   * Get detailed information for a specific state
   *
   * @param stateCode - State code (2 letters)
   * @param query - Query parameters (year, topPlants)
   * @returns Detailed state information with top plants
   */
  async getStateDetail(
    stateCode: string,
    query: GetStateDetailQueryDto
  ): Promise<StateDetailResponseDto> {
    const startTime = Date.now();
    const year = query.year || 2023;
    const topPlants = query.topPlants || 10;

    try {
      this.logger.log(
        `Getting state detail for ${stateCode}, year: ${year}, top: ${topPlants}`
      );

      // Get state detail from repository
      const stateDetail = await this.plantRepository.getStateDetail(
        stateCode.toUpperCase(),
        year
      );

      if (!stateDetail) {
        throw new NotFoundException(`State with code ${stateCode} not found`);
      }

      // Get top plants for the state
      const topPlantsData = await this.plantRepository.getTopNPlants({
        top: topPlants,
        stateCode: stateCode.toUpperCase(),
        year,
      });

      this.logger.log(
        `Retrieved state detail for ${stateCode} in ${Date.now() - startTime}ms`
      );

      return {
        state: stateDetail.state,
        year: stateDetail.year,
        totalGeneration: stateDetail.totalGeneration,
        percentOfNational: stateDetail.percentOfNational,
        plantCount: stateDetail.plantCount,
        topPlants: topPlantsData.map((plant, index) => ({
          id: plant.id,
          plantId: plant.plantId,
          name: plant.name,
          year: plant.year,
          netGeneration: plant.netGeneration,
          percentOfState: plant.percentOfState,
          rank: index + 1,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get state detail: ${error}`);
      throw error;
    }
  }
}
