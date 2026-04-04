/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  // Don't import the real loadEnv or supabase
  moduleNameMapper: {
    '^../lib/supabase$': '<rootDir>/src/__mocks__/supabase',
    '^./gemini$': '<rootDir>/src/__mocks__/gemini',
    '^../services/gemini$': '<rootDir>/src/__mocks__/gemini',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false }],
  },
  // Don't actually load dotenv or start server
  transformIgnorePatterns: ['/node_modules/'],
};
