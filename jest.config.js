module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/main/core/**/*.js',
    '!src/main/core/**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  verbose: true
};
