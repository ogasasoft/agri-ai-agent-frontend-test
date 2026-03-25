const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|mjs|cjs)$': 'babel-jest',
    '^jest\\.setup\\.js$': 'babel-jest',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'cjs', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:@testing-library|@babel|jest-)?)/',
  ],
}

export default config
