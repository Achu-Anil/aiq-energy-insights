/**
 * Jest global setup file
 * Runs before all tests to configure test environment
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  process.env.DATABASE_URL ||
  "postgresql://dev:dev@localhost:5432/powerplants_test";

// Suppress console logs during tests (optional - uncomment to enable)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Set longer timeout for integration tests
jest.setTimeout(10000);
