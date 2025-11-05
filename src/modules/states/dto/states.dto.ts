import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsString,
  Length,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for GET /states query parameters
 * Validates year parameter for state generation summary
 */
export class GetStatesQueryDto {
  @ApiProperty({
    description: "Year to query state generation totals",
    minimum: 1900,
    maximum: 2100,
    default: 2023,
    example: 2023,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "year must be an integer" })
  @Min(1900, { message: "year must be 1900 or later" })
  @Max(2100, { message: "year cannot exceed 2100" })
  year?: number = 2023;
}

/**
 * DTO for GET /states/:code query parameters
 */
export class GetStateDetailQueryDto {
  @ApiProperty({
    description: "Year to query state detail",
    minimum: 1900,
    maximum: 2100,
    default: 2023,
    example: 2023,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "year must be an integer" })
  @Min(1900, { message: "year must be 1900 or later" })
  @Max(2100, { message: "year cannot exceed 2100" })
  year?: number = 2023;

  @ApiPropertyOptional({
    description: "Number of top plants to include",
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "topPlants must be an integer" })
  @Min(1, { message: "topPlants must be at least 1" })
  @Max(100, { message: "topPlants cannot exceed 100" })
  topPlants?: number = 10;
}

/**
 * DTO for state code path parameter validation
 */
export class StateCodeParamDto {
  @ApiProperty({
    description: "State code (2 uppercase letters, e.g., TX, CA, FL)",
    minLength: 2,
    maxLength: 2,
    pattern: "^[A-Z]{2}$",
    example: "TX",
    type: String,
  })
  @IsString({ message: "state code must be a string" })
  @Length(2, 2, { message: "state code must be exactly 2 characters" })
  @Matches(/^[A-Z]{2}$/, {
    message: "state code must be 2 uppercase letters (e.g., TX, CA, FL)",
  })
  code!: string;
}

/**
 * Response DTO for state summary
 */
export class StateSummaryResponseDto {
  @ApiProperty({ description: "State ID", example: 1 })
  stateId!: number;

  @ApiProperty({ description: "State code", example: "TX" })
  code!: string;

  @ApiProperty({ description: "State name", example: "Texas" })
  name!: string;

  @ApiProperty({ description: "Year", example: 2023 })
  year!: number;

  @ApiProperty({
    description: "Total generation in MWh",
    example: 544038647.01,
  })
  totalGeneration!: number;

  @ApiProperty({
    description: "Percentage of national total",
    example: 12.34,
  })
  percentOfNational!: number;

  @ApiProperty({
    description: "Number of plants in state",
    example: 567,
  })
  plantCount!: number;

  @ApiProperty({
    description: "Rank by total generation",
    example: 1,
    required: false,
  })
  rank?: number;
}

/**
 * Response DTO for detailed state information
 */
export class StateDetailResponseDto {
  @ApiProperty({
    description: "State information",
    example: { id: 1, code: "TX", name: "Texas" },
  })
  state!: {
    id: number;
    code: string;
    name: string;
  };

  @ApiProperty({ description: "Year", example: 2023 })
  year!: number;

  @ApiProperty({
    description: "Total generation in MWh",
    example: 544038647.01,
  })
  totalGeneration!: number;

  @ApiProperty({
    description: "Percentage of national total",
    example: 12.34,
  })
  percentOfNational!: number;

  @ApiProperty({
    description: "Number of plants in state",
    example: 567,
  })
  plantCount!: number;

  @ApiProperty({
    description: "Top plants by generation",
    isArray: true,
    type: Object,
  })
  topPlants!: Array<{
    id: number;
    plantId: number;
    name: string;
    year: number;
    netGeneration: number;
    percentOfState: number;
    rank: number;
  }>;
}

// Re-export common DTOs
export { ErrorResponseDto } from "../../../common/dto/common.dto";

/**
 * Paginated response wrapper for states
 */
export class PaginatedStatesResponseDto {
  @ApiProperty({
    description: "Array of state summaries",
    isArray: true,
    type: StateSummaryResponseDto,
  })
  data!: StateSummaryResponseDto[];

  @ApiProperty({
    description: "Query metadata",
    example: { year: 2023, total: 51, nationalTotal: 4408399320.5 },
  })
  meta!: {
    year: number;
    total: number;
    nationalTotal: number;
  };
}
