import { Module } from "@nestjs/common";
import { PlantsController } from "./plants.controller";
import { PlantsService } from "./plants.service";
import { PlantRepository } from "./repositories/plant.repository";

/**
 * PlantsModule
 *
 * Encapsulates all plant-related functionality:
 * - Controllers for HTTP endpoints
 * - Services for business logic
 * - Repositories for data access
 */
@Module({
  controllers: [PlantsController],
  providers: [PlantsService, PlantRepository],
  exports: [PlantsService],
})
export class PlantsModule {}
