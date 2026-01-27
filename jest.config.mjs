import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Next.js app dizini
  dir: './',
})

// Jest'e özel konfigürasyon
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,ts}',
    'app/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  testTimeout: 30000, // 30 saniye timeout
  // Environment variable'ları test ortamında kullanılabilir yap
  globals: {
    'process.env': {
      ...process.env,
    },
  },
}

export default createJestConfig(customJestConfig)
