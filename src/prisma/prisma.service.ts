import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * PrismaService
 *
 * Extends PrismaClient to provide database access throughout the application.
 * Manages the database connection lifecycle with proper initialization and cleanup.
 *
 * Features:
 * - Automatic connection on module init
 * - Graceful disconnect on module destroy
 * - Query logging for development/debugging
 * - Error and warning event logging
 * - Global module availability via PrismaModule
 *
 * Usage:
 * ```typescript
 * constructor(private readonly prisma: PrismaService) {}
 *
 * async getPlants() {
 *   return this.prisma.plant.findMany();
 * }
 * ```
 *
 * Connection String:
 * Set via environment variable DATABASE_URL in .env:
 * DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Initialize Prisma Client with logging configuration
   *
   * Logs are emitted as events to allow custom handling
   * via the $on() method if needed in the future.
   */
  constructor() {
    super({
      log: [
        { emit: "event", level: "query" }, // Log all database queries
        { emit: "event", level: "error" }, // Log database errors
        { emit: "event", level: "warn" }, // Log warnings
      ],
    });
  }

  /**
   * Connect to database when module initializes
   *
   * Called automatically by NestJS during application bootstrap.
   * Establishes the database connection pool and verifies connectivity.
   *
   * @throws {Error} If database connection fails - will prevent app startup
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Successfully connected to database");
    } catch (error) {
      this.logger.error("Failed to connect to database", error);
      throw error;
    }
  }

  /**
   * Disconnect from database when module is destroyed
   *
   * Called automatically by NestJS during graceful shutdown.
   * Closes all active database connections and cleans up resources.
   *
   * Errors during disconnect are logged but don't throw to allow
   * other cleanup operations to complete.
   */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log("Successfully disconnected from database");
    } catch (error) {
      this.logger.error("Failed to disconnect from database", error);
      // Don't throw - allow other cleanup to proceed
    }
  }
}
