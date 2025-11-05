import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsString,
  Length,
  Matches,
  IsPositive,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for GET /plants query parameters
 * Validates top N query with optional state and year filters
 */
export class GetPlantsQueryDto {
  @ApiProperty({
    description: "Number of top plants to return",
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "top must be an integer" })
  @Min(1, { message: "top must be at least 1" })
  @Max(100, { message: "top cannot exceed 100" })
  @IsPositive({ message: "top must be a positive number" })
  top?: number = 10;

  @ApiPropertyOptional({
    description: "State code (2 uppercase letters, e.g., TX, CA, FL)",
    minLength: 2,
    maxLength: 2,
    pattern: "^[A-Z]{2}$",
    example: "TX",
    type: String,
  })
  @IsOptional()
  @IsString({ message: "state must be a string" })
  @Length(2, 2, { message: "state must be exactly 2 characters" })
  @Matches(/^[A-Z]{2}$/, {
    message: "state must be 2 uppercase letters (e.g., TX, CA, FL)",
  })
  state?: string;

  @ApiPropertyOptional({
    description: "Year to filter generation data",
    minimum: 1900,
    maximum: 2100,
    example: 2023,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "year must be an integer" })
  @Min(1900, { message: "year must be 1900 or later" })
  @Max(2100, { message: "year cannot exceed 2100" })
  year?: number;
}

/**
 * DTO for GET /states query parameters
 */
export class GetStatesQueryDto {
  @ApiProperty({
    description: "Year to query state generation totals",
    minimum: 1900,
    maximum: 2100,
    example: 2023,
    type: Number,
  })
  @Type(() => Number)
  @IsInt({ message: "year must be an integer" })
  @Min(1900, { message: "year must be 1900 or later" })
  @Max(2100, { message: "year cannot exceed 2100" })
  year!: number;
}

/**
 * DTO for GET /states/:code query parameters
 */
export class GetStateDetailQueryDto {
  @ApiProperty({
    description: "Year to query state details",
    minimum: 1900,
    maximum: 2100,
    example: 2023,
    type: Number,
  })
  @Type(() => Number)
  @IsInt({ message: "year must be an integer" })
  @Min(1900, { message: "year must be 1900 or later" })
  @Max(2100, { message: "year cannot exceed 2100" })
  year!: number;
}

/**
 * DTO for state code path parameter
 */
export class StateCodeParamDto {
  @ApiProperty({
    description: "State code (2 uppercase letters)",
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
 * Response DTO for plant data
 */
export class PlantResponseDto {
  @ApiProperty({ description: "Plant generation record ID", example: 12345 })
  id!: number;

  @ApiProperty({ description: "Plant ID", example: 1001 })
  plantId!: number;

  @ApiProperty({ description: "Plant name", example: "South Texas Project" })
  name!: string;

  @ApiProperty({
    description: "State information",
    example: { id: 1, code: "TX", name: "Texas" },
  })
  state!: {
    id: number;
    code: string;
    name: string;
  };

  @ApiProperty({ description: "Generation year", example: 2023 })
  year!: number;

  @ApiProperty({
    description: "Net generation in MWh",
    example: 21787144.5,
  })
  netGeneration!: number;

  @ApiProperty({
    description: "Percentage of state total generation",
    example: 8.42,
  })
  percentOfState!: number;

  @ApiProperty({
    description: "Rank in result set",
    example: 1,
    required: false,
  })
  rank?: number;
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
}

/**
 * Generic error response DTO
 */
export class ErrorResponseDto {
  @ApiProperty({ description: "HTTP status code", example: 400 })
  statusCode!: number;

  @ApiProperty({
    description: "Error message or array of validation errors",
    example: ["top must be at least 1", "state must be 2 uppercase letters"],
  })
  message!: string | string[];

  @ApiProperty({ description: "Error type", example: "Bad Request" })
  error!: string;

  @ApiProperty({
    description: "Request timestamp",
    example: "2023-11-05T10:30:00.000Z",
  })
  timestamp?: string;

  @ApiProperty({ description: "Request path", example: "/plants" })
  path?: string;
}

/**
 * Paginated response wrapper (for future use)
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: "Data array", isArray: true })
  data!: T[];

  @ApiProperty({
    description: "Metadata about the query",
    example: { year: 2023, top: 10, state: "TX" },
  })
  meta!: {
    year?: number;
    top?: number;
    state?: string;
    total?: number;
  };
}
