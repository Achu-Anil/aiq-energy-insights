import { Controller, Get, Query, Param, Logger } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { StatesService } from "./states.service";
import {
  GetStatesQueryDto,
  GetStateDetailQueryDto,
  StateCodeParamDto,
  StateSummaryResponseDto,
  StateDetailResponseDto,
  ErrorResponseDto,
} from "./dto/states.dto";

/**
 * StatesController
 *
 * Handles all state-related API endpoints:
 * - GET /states - Get all states summary with generation totals
 * - GET /states/:code - Get detailed state information with top plants
 */
@Controller("states")
@ApiTags("States")
export class StatesController {
  private readonly logger = new Logger(StatesController.name);

  constructor(private readonly statesService: StatesService) {}

  /**
   * GET /states
   * Get all states with generation summary
   *
   * @param query - Query parameters (year)
   * @returns Array of state summaries with totals and percentages
   */
  @Get()
  @ApiOperation({
    summary: "Get all states summary",
    description:
      "Returns generation summary for all states including total generation, percentage of national total, and plant counts.",
  })
  @ApiQuery({
    name: "year",
    required: false,
    type: Number,
    description: "Year to filter (defaults to 2023)",
    example: 2023,
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved states summary",
    type: [StateSummaryResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: "Invalid query parameters",
    type: ErrorResponseDto,
  })
  async getStatesSummary(@Query() query: GetStatesQueryDto) {
    this.logger.log(`GET /states - Year: ${query.year || 2023}`);
    return this.statesService.getStatesSummary(query);
  }

  /**
   * GET /states/:code
   * Get detailed information for a specific state
   *
   * @param code - State code (2 letters, e.g., TX)
   * @param query - Query parameters (year, topPlants)
   * @returns Detailed state information with top plants
   */
  @Get(":code")
  @ApiOperation({
    summary: "Get state details",
    description:
      "Returns detailed information for a specific state including total generation, percentage of national total, and top N plants.",
  })
  @ApiParam({
    name: "code",
    type: String,
    description: "State code (2 uppercase letters)",
    example: "TX",
  })
  @ApiQuery({
    name: "year",
    required: false,
    type: Number,
    description: "Year to filter (defaults to 2023)",
    example: 2023,
  })
  @ApiQuery({
    name: "topPlants",
    required: false,
    type: Number,
    description: "Number of top plants to include (1-100)",
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved state details",
    type: StateDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid parameters",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "State not found",
    type: ErrorResponseDto,
  })
  async getStateDetail(
    @Param("code") code: string,
    @Query() query: GetStateDetailQueryDto
  ) {
    this.logger.log(
      `GET /states/${code} - Year: ${query.year || 2023}, Top: ${
        query.topPlants || 10
      }`
    );
    return this.statesService.getStateDetail(code, query);
  }
}
