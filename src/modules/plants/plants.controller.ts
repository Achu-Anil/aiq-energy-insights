import {
  Controller,
  Get,
  Query,
  Param,
  Logger,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { PlantsService } from "./plants.service";
import {
  GetPlantsQueryDto,
  PlantResponseDto,
  ErrorResponseDto,
} from "./dto/plants.dto";

/**
 * PlantsController
 *
 * Handles all plant-related API endpoints:
 * - GET /plants - Get top N plants (global or by state)
 * - GET /plants/:id - Get individual plant details
 */
@Controller("plants")
@ApiTags("Plants")
export class PlantsController {
  private readonly logger = new Logger(PlantsController.name);

  constructor(private readonly plantsService: PlantsService) {}

  /**
   * GET /plants
   * Get top N plants by net generation
   *
   * @param query - Query parameters (top, state, year)
   * @returns Array of top plants with generation data
   */
  @Get()
  @ApiOperation({
    summary: "Get top N plants by net generation",
    description:
      "Returns top plants globally or filtered by state code. Includes percentage of state total generation.",
  })
  @ApiQuery({
    name: "top",
    required: false,
    type: Number,
    description: "Number of plants to return (1-100)",
    example: 10,
  })
  @ApiQuery({
    name: "state",
    required: false,
    type: String,
    description: "State code (2 letters)",
    example: "TX",
  })
  @ApiQuery({
    name: "year",
    required: false,
    type: Number,
    description: "Year to filter",
    example: 2023,
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved top plants",
    type: [PlantResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: "Invalid query parameters",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "State not found",
    type: ErrorResponseDto,
  })
  async getTopPlants(@Query() query: GetPlantsQueryDto) {
    this.logger.log(`GET /plants - Query: ${JSON.stringify(query)}`);
    return this.plantsService.getTopPlants(query);
  }

  /**
   * GET /plants/:id
   * Get individual plant details with generation history
   *
   * @param id - Plant ID
   * @returns Plant details with all generation records
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get plant by ID",
    description:
      "Returns detailed information about a specific plant including generation history.",
  })
  @ApiParam({
    name: "id",
    type: Number,
    description: "Plant ID",
    example: 1001,
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved plant details",
  })
  @ApiResponse({
    status: 404,
    description: "Plant not found",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid plant ID format",
    type: ErrorResponseDto,
  })
  async getPlantById(@Param("id", ParseIntPipe) id: number) {
    this.logger.log(`GET /plants/${id}`);
    return this.plantsService.getPlantById(id);
  }
}
