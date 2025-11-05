import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { GetPlantsQueryDto, PlantResponseDto } from "./dto/plants.dto";
import { PlantRepository } from "./repositories/plant.repository";

/**
 * PlantsService
 *
 * Business logic layer for plant operations
 * Orchestrates repository calls and data transformation
 */
@Injectable()
export class PlantsService {
  private readonly logger = new Logger(PlantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plantRepository: PlantRepository
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
      this.logger.log(
        `Getting top ${query.top || 10} plants for state: ${
          query.state || "ALL"
        }, year: ${query.year || "ALL"}`
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

      return plants.map((plant, index) => ({
        id: plant.id,
        plantId: plant.plantId,
        name: plant.name,
        state: plant.state,
        year: plant.year,
        netGeneration: plant.netGeneration,
        percentOfState: plant.percentOfState,
        rank: index + 1,
      }));
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
      this.logger.log(`Getting plant details for ID: ${plantId}`);

      const plant = await this.plantRepository.getPlantById(plantId);

      if (!plant) {
        throw new NotFoundException(`Plant with ID ${plantId} not found`);
      }

      this.logger.log(
        `Retrieved plant ${plantId} in ${Date.now() - startTime}ms`
      );

      return plant;
    } catch (error) {
      this.logger.error(`Failed to get plant by ID: ${error}`);
      throw error;
    }
  }
}
