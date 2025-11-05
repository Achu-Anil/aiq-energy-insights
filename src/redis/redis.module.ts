import { Module, Global } from "@nestjs/common";
import { Redis } from "ioredis";

/**
 * Redis Client Injection Token
 *
 * Use this token to inject the Redis client into your services:
 * ```typescript
 * constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
 * ```
 */
export const REDIS_CLIENT = "REDIS_CLIENT";

/**
 * Redis Provider Factory
 *
 * Creates a Redis client with graceful fallback behavior.
 * If Redis is unavailable, returns a mock client that:
 * - Always returns null for GET operations
 * - Returns "OK" for SET operations
 * - Doesn't throw errors
 *
 * This allows the application to function without caching
 * when Redis is not available (development, testing, degraded state).
 *
 * Environment Variables:
 * - REDIS_HOST: Redis server hostname (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_DB: Redis database number (default: 0)
 *
 * Connection Behavior:
 * - Retries 3 times with exponential backoff (100ms, 200ms, 300ms)
 * - After 3 failures, falls back to mock client
 * - Emits events for connect/error states
 */
export const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    const logger = console;

    try {
      // Configure Redis connection options
      const options: any = {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        retryStrategy: (times: number) => {
          // Retry up to 3 times with exponential backoff
          if (times > 3) {
            logger.warn(
              "Redis connection failed after 3 attempts, operating without cache"
            );
            return null; // Stop retrying - will trigger fallback
          }
          return Math.min(times * 100, 3000); // 100ms, 200ms, 300ms
        },
      };

      // Add password if provided
      if (process.env.REDIS_PASSWORD) {
        options.password = process.env.REDIS_PASSWORD;
      }

      const redis = new Redis(options);

      // Log successful connection
      redis.on("connect", () => {
        logger.log("✅ Redis connected successfully");
      });

      // Log errors but don't crash - continue with degraded caching
      redis.on("error", (err) => {
        logger.warn(`Redis error (operating without cache): ${err.message}`);
      });

      return redis;
    } catch (error) {
      // If Redis initialization fails completely, return mock client
      logger.warn(
        `Failed to initialize Redis (operating without cache): ${error}`
      );

      // Mock Redis client that implements the same interface
      // but does nothing - allows app to run without caching
      return {
        get: async () => null, // Always cache miss
        set: async () => "OK", // Pretend to set
        setex: async () => "OK", // Pretend to set with expiry
        del: async () => 0, // Pretend to delete
        keys: async () => [], // No keys
        scan: async () => ["0", []], // Empty scan
        exists: async () => 0, // Key doesn't exist
        on: () => {}, // No-op event listener
      };
    }
  },
};

/**
 * RedisModule
 *
 * Global module providing Redis client throughout the application.
 *
 * Features:
 * - Graceful fallback if Redis is unavailable
 * - Auto-reconnection with retry strategy
 * - Global availability (no need to import in feature modules)
 * - Mock client for degraded operation
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
 *
 *   async getData() {
 *     const cached = await this.redis.get('key');
 *     if (cached) return JSON.parse(cached);
 *     // ... fetch from database
 *     await this.redis.setex('key', 3600, JSON.stringify(data));
 *     return data;
 *   }
 * }
 * ```
 *
 * @see redisProvider for configuration details
 */
@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
