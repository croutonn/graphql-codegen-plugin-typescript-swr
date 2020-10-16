const { resolve } = require('path')
const { pathsToModuleNameMapper } = require('ts-jest/utils')

const pkg = require('./package.json')
const tsconfig = require('./tsconfig.json')
const CI = !!process.env.CI

module.exports = () => {
  return {
    displayName: pkg.name,
    rootDir: __dirname,
    transform: { '^.+\\.tsx?$': 'ts-jest' },
    testEnvironment: 'node',
    globals: {
      'ts-jest': {
        diagnostics: false,
        tsConfig: 'tsconfig.json',
      },
    },
    restoreMocks: true,
    reporters: ['default'],
    modulePathIgnorePatterns: ['dist'],
    moduleNameMapper: pathsToModuleNameMapper(
      tsconfig.compilerOptions.paths || [],
      {
        prefix: `./`,
      }
    ),
    cacheDirectory: resolve(
      __dirname,
      `${CI ? '' : 'node_modules/'}.cache/jest`
    ),
    setupFiles: [`${__dirname}/dev-test/setup.js`],
    collectCoverage: false,
  }
}
