import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // Map ESM-only @octokit packages to manual CJS mocks in src/__mocks__
  moduleNameMapper: {
    '^@octokit/app$': '<rootDir>/__mocks__/@octokit/app.ts',
  },
};

export default config;
