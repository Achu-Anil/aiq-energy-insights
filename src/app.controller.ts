import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

/**
 * AppController
 *
 * Root controller for the application.
 * Provides basic endpoints for API health checks and welcome messages.
 *
 * Endpoints:
 * - GET /api - Welcome message
 * - GET /api/health - Health check for monitoring/load balancers
 */
@Controller()
@ApiTags("System")
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Welcome endpoint
   *
   * Returns a simple welcome message to confirm API is accessible.
   * Useful for testing basic connectivity.
   *
   * @returns Welcome message string
   */
  @Get()
  @ApiOperation({
    summary: "API welcome message",
    description: "Returns a welcome message to confirm the API is running",
  })
  @ApiResponse({
    status: 200,
    description: "Welcome message returned successfully",
    schema: {
      type: "string",
      example: "Hello World! Welcome to AIQ Backend Challenge API",
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Health check endpoint
   *
   * Returns current health status and timestamp.
   * Used by:
   * - Docker health checks
   * - Kubernetes liveness/readiness probes
   * - Load balancers for health monitoring
   * - CI/CD pipelines for deployment verification
   *
   * @returns Object with status and ISO timestamp
   */
  @Get("health")
  @ApiOperation({
    summary: "Health check endpoint",
    description:
      "Returns the current health status of the API. Used for monitoring and container orchestration.",
  })
  @ApiResponse({
    status: 200,
    description: "Service is healthy and operational",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "OK" },
        timestamp: {
          type: "string",
          format: "date-time",
          example: "2023-11-05T12:34:56.789Z",
        },
      },
    },
  })
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }
}
