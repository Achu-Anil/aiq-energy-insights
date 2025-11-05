import { Injectable } from "@nestjs/common";

/**
 * AppService
 *
 * Root application service providing basic system-level operations.
 * Contains simple utility methods for API health and welcome messages.
 *
 * This service is intentionally minimal as the main business logic
 * is contained in feature-specific modules (Plants, States).
 */
@Injectable()
export class AppService {
  /**
   * Returns a welcome message for the API
   *
   * @returns {string} Friendly welcome message
   */
  getHello(): string {
    return "Hello World! Welcome to AIQ Backend Challenge API";
  }

  /**
   * Returns health status of the application
   *
   * This is a lightweight check that only verifies the API process is running.
   * For production, consider adding:
   * - Database connection checks
   * - Redis availability
   * - Memory/CPU usage metrics
   * - Dependency service health
   *
   * @returns {Object} Health status object
   * @returns {string} status - Always "OK" if the service is running
   * @returns {string} timestamp - Current ISO 8601 timestamp
   */
  getHealth(): { status: string; timestamp: string } {
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
    };
  }
}
