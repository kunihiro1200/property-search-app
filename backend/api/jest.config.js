module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        noImplicitReturns: false,
        strict: false,
        noImplicitAny: false,
        strictNullChecks: false,
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        moduleResolution: 'node',
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(p-queue|p-timeout|eventemitter3)/)',
  ],
  testTimeout: 30000,
};
