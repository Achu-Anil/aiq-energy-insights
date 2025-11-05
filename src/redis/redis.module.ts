import { Module, Global } from "@nestjs/common";
import { Redis } from "ioredis";

/**
 * Redis provider factory
 * Creates Redis client with optional connection (graceful fallback)
 */
export const REDIS_CLIENT = "REDIS_CLIENT";

export const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    const logger = console;

    try {
      const options: any = {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.warn(
              "Redis connection failed after 3 attempts, operating without cache"
            );
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
      };

      if (process.env.REDIS_PASSWORD) {
        options.password = process.env.REDIS_PASSWORD;
      }

      const redis = new Redis(options);

      redis.on("connect", () => {
        logger.log("✅ Redis connected successfully");
      });

      redis.on("error", (err) => {
        logger.warn(`Redis error (operating without cache): ${err.message}`);
      });

      return redis;
    } catch (error) {
      logger.warn(
        `Failed to initialize Redis (operating without cache): ${error}`
      );
      // Return mock Redis client that does nothing
      return {
        get: async () => null,
        set: async () => "OK",
        setex: async () => "OK",
        del: async () => 0,
        keys: async () => [],
        scan: async () => ["0", []],
        exists: async () => 0,
        on: () => {},
      };
    }
  },
};

/**
 * RedisModule
 *
 * Global module that provides Redis client with graceful fallback
 */
@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
