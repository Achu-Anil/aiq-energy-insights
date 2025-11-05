module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
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
    "./src/modules/plants/plants.service.ts": {
      branches: 75,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    "./src/modules/states/states.service.ts": {
      branches: 60,
      functions: 80,
      lines: 90,
      statements: 90,
    },
    "./src/modules/plants/repositories/plant.repository.ts": {
      branches: 80,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  testTimeout: 10000,
  verbose: true,
};
