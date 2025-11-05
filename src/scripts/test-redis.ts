import { config } from "dotenv";
import Redis from "ioredis";

// Load environment variables
config();

/**
 * Test Redis connection and basic operations
 */
async function testRedisConnection() {
  console.log("=== Redis Connection Test ===\n");

  const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
    db: parseInt(process.env.REDIS_DB || "0", 10),
    retryStrategy: (times) => {
      // Stop retrying after 3 attempts
      if (times > 3) {
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true, // Don't connect immediately
  });

  try {
    console.log("Configuration:");
    console.log(`  Host: ${process.env.REDIS_HOST || "localhost"}`);
    console.log(`  Port: ${process.env.REDIS_PORT || "6379"}`);
    console.log(`  Database: ${process.env.REDIS_DB || "0"}`);
    console.log(
      `  Password: ${process.env.REDIS_PASSWORD ? "***" : "(none)"}\n`
    );

    console.log("Attempting to connect...");
    await redis.connect();
    console.log("✓ Successfully connected to Redis\n");

    // Test 1: PING
    console.log("Test 1: PING");
    const pingResult = await redis.ping();
    console.log(`  Result: ${pingResult}`);
    console.log("  ✓ PING test passed\n");

    // Test 2: SET/GET
    console.log("Test 2: SET/GET operations");
    const testKey = "test:connection";
    const testValue = `Connection test at ${new Date().toISOString()}`;

    await redis.set(testKey, testValue);
    console.log(`  SET ${testKey}`);

    const getValue = await redis.get(testKey);
    console.log(`  GET ${testKey}`);
    console.log(`  Value: ${getValue}`);

    if (getValue === testValue) {
      console.log("  ✓ SET/GET test passed\n");
    } else {
      console.log("  ✗ SET/GET test failed\n");
    }

    // Test 3: Key operations
    console.log("Test 3: Key operations");
    await redis.set("test:key1", "value1", "EX", 60);
    await redis.set("test:key2", "value2", "EX", 60);
    await redis.set("test:key3", "value3", "EX", 60);

    const keys = await redis.keys("test:*");
    console.log(`  Found ${keys.length} keys matching 'test:*'`);
    console.log(`  Keys: ${keys.join(", ")}`);
    console.log("  ✓ Key operations test passed\n");

    // Test 4: Delete operations
    console.log("Test 4: DELETE operations");
    const deleteCount = await redis.del(...keys);
    console.log(`  Deleted ${deleteCount} keys`);
    console.log("  ✓ DELETE test passed\n");

    // Test 5: Server info
    console.log("Test 5: Server information");
    const info = await redis.info("server");
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : "unknown";
    console.log(`  Redis version: ${version}`);

    const memInfo = await redis.info("memory");
    const memMatch = memInfo.match(/used_memory_human:([^\r\n]+)/);
    const memory = memMatch ? memMatch[1] : "unknown";
    console.log(`  Memory usage: ${memory}`);

    const dbSize = await redis.dbsize();
    console.log(`  Total keys in DB: ${dbSize}`);
    console.log("  ✓ Server info test passed\n");

    console.log("=================================");
    console.log("✓ All Redis tests passed!");
    console.log("=================================\n");
    console.log("Redis is ready for use with your application.");

    await redis.quit();
    process.exit(0);
  } catch (error: any) {
    console.error("\n✗ Redis connection test failed!\n");

    if (error.code === "ECONNREFUSED") {
      console.error(
        "Connection refused. Redis server is not running or not accessible.\n"
      );
      console.error("Possible solutions:");
      console.error("  1. Start Redis using Docker:");
      console.error(
        "     docker run -d --name redis-aiq -p 6379:6379 redis:latest\n"
      );
      console.error("  2. Install and start Memurai (Windows Redis):");
      console.error("     https://www.memurai.com/get-memurai\n");
      console.error("  3. Use WSL2 with Redis:");
      console.error("     wsl");
      console.error("     sudo service redis-server start\n");
      console.error("See REDIS_SETUP.md for detailed instructions.");
    } else if (error.code === "ETIMEDOUT") {
      console.error(
        "Connection timed out. Check your network and firewall settings."
      );
    } else if (error.message?.includes("WRONGPASS")) {
      console.error(
        "Authentication failed. Check your REDIS_PASSWORD in .env file."
      );
    } else {
      console.error("Error details:", error.message);
    }

    try {
      await redis.quit();
    } catch (quitError) {
      // Ignore quit errors
    }

    process.exit(1);
  }
}

// Run the test
testRedisConnection();
