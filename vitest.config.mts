import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // graphql@16 has no `exports`, so Vite would pick `index.mjs` via the
    // `module` field while externalized deps get the CJS build from Node,
    // yielding two graphql instances ("from another module or realm").
    alias: { graphql: 'graphql/index.js' },
  },
  test: {
    environment: 'node',
    restoreMocks: true,
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./dev-test/setup.js'],
    server: {
      deps: {
        // @graphql-codegen/testing@5's ESM build calls `require.resolve`, and
        // its CJS build can't `require('vitest')`; inlining it lets Vitest
        // provide `require` to the ESM build.
        inline: ['@graphql-codegen/testing'],
      },
    },
  },
})
