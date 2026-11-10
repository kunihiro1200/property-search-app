// Standalone credential-safety suite. No integration setup, DB or real Google credentials.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/GoogleSheetsClientAuthCompatibility.test.ts',
    '**/GoogleSheetsClientCredentialLogging.test.ts',
  ],
  setupFilesAfterEnv: [],
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverage: false,
  testTimeout: 10000,
};
