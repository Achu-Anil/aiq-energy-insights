import { ApiProperty } from "@nestjs/swagger";

/**
 * Generic error response DTO
 * Used across all API endpoints for consistent error formatting
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
    required: false,
  })
  timestamp?: string;

  @ApiProperty({
    description: "Request path",
    example: "/api/plants",
    required: false,
  })
  path?: string;

  @ApiProperty({
    description: "Correlation ID for tracing",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: false,
  })
  traceId?: string;
}

/**
 * Paginated response wrapper
 * Generic wrapper for paginated endpoints
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: "Data array", isArray: true })
  data!: T[];

  @ApiProperty({
    description: "Metadata about the query",
    example: { year: 2023, top: 10, state: "TX", total: 100 },
  })
  meta!: {
    year?: number;
    top?: number;
    state?: string;
    total?: number;
    page?: number;
    limit?: number;
  };
}
