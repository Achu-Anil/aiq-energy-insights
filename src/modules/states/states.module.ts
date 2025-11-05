import { Module } from "@nestjs/common";
import { StatesController } from "./states.controller";
import { StatesService } from "./states.service";
import { StateRepository } from "./repositories/state.repository";
import { PlantRepository } from "../plants/repositories/plant.repository";

/**
 * StatesModule
 *
 * Encapsulates all state-related functionality:
 * - Controllers for HTTP endpoints
 * - Services for business logic
 * - Repositories for data access
 */
@Module({
  controllers: [StatesController],
  providers: [
    StatesService,
    StateRepository,
    PlantRepository, // Needed for plant queries within state endpoints
  ],
  exports: [StatesService],
})
export class StatesModule {}
