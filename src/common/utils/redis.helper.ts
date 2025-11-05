import { Redis } from "ioredis";
import { Logger } from "@nestjs/common";

/**
 * Redis helper utility for cache management operations
 * Provides efficient key deletion and cache invalidation patterns
 */
export class RedisHelper {
  private readonly logger = new Logger(RedisHelper.name);

  constructor(private readonly redis: Redis) {}

  /**
   * Delete all Redis keys matching a prefix pattern
   * Uses SCAN for memory-efficient deletion of large keysets
   *
   * @param prefix - The key prefix to match (e.g., "states:", "state:")
   * @returns Number of keys deleted
   *
   * @example
   * const count = await redisHelper.deleteByPrefix('states:');
   * console.log(`Deleted ${count} keys`);
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    let cursor = "0";
    let deletedCount = 0;
    const pattern = `${prefix}*`;

    this.logger.debug(`Starting deletion for pattern: ${pattern}`);

    do {
      // Use SCAN to iterate through keys without blocking Redis
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100 // Process 100 keys per iteration
      );

      cursor = nextCursor;

      if (keys.length > 0) {
        // Delete keys in batch
        const deleted = await this.redis.del(...keys);
        deletedCount += deleted;
        this.logger.debug(`Deleted ${deleted} keys (total: ${deletedCount})`);
      }
    } while (cursor !== "0"); // Continue until cursor returns to 0

    this.logger.log(`Deleted ${deletedCount} keys with prefix: ${prefix}`);
    return deletedCount;
  }

  /**
   * Delete multiple key prefixes in parallel
   * More efficient than sequential deletion when dealing with multiple prefixes
   *
   * @param prefixes - Array of key prefixes to delete
   * @returns Map of prefix to number of keys deleted
   *
   * @example
   * const results = await redisHelper.deleteByPrefixes(['states:', 'state:', 'plants:']);
   * results.forEach((count, prefix) => console.log(`${prefix}: ${count} keys deleted`));
   */
  async deleteByPrefixes(prefixes: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    this.logger.log(`Deleting keys for ${prefixes.length} prefixes...`);

    // Execute deletions in parallel for better performance
    await Promise.all(
      prefixes.map(async (prefix) => {
        const count = await this.deleteByPrefix(prefix);
        results.set(prefix, count);
      })
    );

    return results;
  }

  /**
   * Invalidate cache and rebuild hot payloads in a single operation
   * This is the recommended pattern for cache invalidation followed by warming
   *
   * @param prefixes - Array of key prefixes to invalidate
   * @param rebuildFn - Async function to rebuild the cache (warm up hot payloads)
   * @returns Object with deletion statistics and rebuild time
   *
   * @example
   * const result = await redisHelper.invalidateAndRebuild(
   *   ['states:', 'state:'],
   *   async () => await cacheWarmingService.warmAllStates()
   * );
   * console.log(`Deleted ${result.deletedKeys.size} prefix groups in ${result.rebuildTime}ms`);
   */
  async invalidateAndRebuild(
    prefixes: string[],
    rebuildFn: () => Promise<void>
  ): Promise<{ deletedKeys: Map<string, number>; rebuildTime: number }> {
    const startTime = Date.now();

    this.logger.log("Starting cache invalidation and rebuild...");

    // Step 1: Delete old cache keys
    const deletedKeys = await this.deleteByPrefixes(prefixes);

    const deletionTime = Date.now() - startTime;
    this.logger.log(`Cache invalidation completed in ${deletionTime}ms`);

    // Step 2: Rebuild hot payloads
    const rebuildStartTime = Date.now();
    await rebuildFn();
    const rebuildTime = Date.now() - rebuildStartTime;

    this.logger.log(`Cache rebuild completed in ${rebuildTime}ms`);

    const totalTime = Date.now() - startTime;
    this.logger.log(`Total invalidation and rebuild time: ${totalTime}ms`);

    return { deletedKeys, rebuildTime };
  }

  /**
   * Check if Redis connection is healthy
   * @returns true if connected, false otherwise
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error("Redis connection check failed:", error);
      return false;
    }
  }

  /**
   * Get total number of keys in the database
   * Useful for monitoring and debugging
   * @returns Number of keys in current database
   */
  async getKeyCount(): Promise<number> {
    return await this.redis.dbsize();
  }

  /**
   * Get memory usage statistics
   * @returns Memory usage in bytes
   */
  async getMemoryUsage(): Promise<number> {
    const info = await this.redis.info("memory");
    const match = info.match(/used_memory:(\d+)/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }
}
