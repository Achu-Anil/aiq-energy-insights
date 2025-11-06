module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.e2e-spec.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  testTimeout: 30000, // E2E tests may take longer
  verbose: true,
  maxWorkers: 1, // Run tests serially for E2E
  forceExit: true, // Force exit after tests complete
  detectOpenHandles: false, // Don't detect open handles (known issue with NestJS)
};
