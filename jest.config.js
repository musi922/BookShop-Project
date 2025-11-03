module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/gen/',
    '/mta_archives/',
    '/dist/'
  ],
  testMatch: [
    '**/test/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'srv/**/*.js',
    'app/**/controller/**/*.js',
    '!**/node_modules/**',
    '!**/gen/**',
    '!**/dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};