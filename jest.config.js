module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  // Exclude integration tests from normal test runs (they require real database)
  testPathIgnorePatterns: ["/node_modules/", "\\.integration\\.spec\\.ts$"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,js}",
    "!src/**/*.d.ts",
    "!src/main.ts",
    "!src/generated/**",
    "!src/scripts/**",
    "!src/**/*.module.ts",
    "!src/**/*.entity.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.e2e-spec.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    // Only check coverage for tested business logic (not infrastructure)
    // Service layer (business logic) - unit tested with mocked dependencies
    "./src/modules/plants/plants.service.ts": {
      branches: 80,
      functions: 100,
      lines: 98,
      statements: 98,
    },
    "./src/modules/states/states.service.ts": {
      branches: 70,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    // Repository layer requires integration tests with real database
    // These thresholds are enforced separately in integration test suite
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  testTimeout: 10000,
  verbose: true,
};
