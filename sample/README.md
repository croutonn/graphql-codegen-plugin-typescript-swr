# graphql-codegen-plugin-typescript-swr smoke test app

A React + Tailwind CSS app for manually verifying, in a real browser, that the generated SWR hooks still work whenever you bump a dependency such as `swr` / `graphql-request` / `graphql` / `react`. The backend is mocked entirely in the browser via [MSW](https://mswjs.io/), so `yarn dev` alone is enough — no separate server needed.

## Usage (smoke-test procedure after a dependency update)

1. Update the dependency at the root (`swr` / `graphql-request` / `graphql` / `react` etc. in the root `package.json`, and/or the matching version in `sample/package.json`).
2. At the root, run `yarn build` (builds the plugin itself).
3. At the root, run `yarn sample:codegen` (regenerates `sample/src/generated/*.ts`).
4. In `sample`, run `yarn install` (if a dependency changed).
   - If you updated `msw`, also run `npx msw init public --save` to regenerate the Service Worker script.
5. In `sample`, run `yarn dev` and check each tab visually.

## Demo tabs

| Tab | What it verifies |
|---|---|
| Basic query | The default-config `useComment` hook (explicit key) |
| autogenSWRKey | The key-omission pattern from `autogenSWRKey: true` |
| useSWRInfinite | Pagination via `useSWRInfinite: ["Feed"]` (※known limitation, see below) |
| excludeQueries | An excluded query becomes a plain Promise function instead of a hook |
| mutation | `submitComment` / `vote` plus cache revalidation via `mutate()` |
| Authorization | `currentUser` changes depending on whether a JWT header is present |

## Schema and mock data

Uses `dev-test/githunt`'s schema and documents (the GitHunt sample schema) as-is. There's no real backend — the in-memory data in `src/mocks/data.ts` is served by the MSW handlers in `src/mocks/handlers.ts`.

## Known limitations

- **`rawRequest: true` is not supported.** The current plugin (`src/visitor.ts`) has a known bug where, even with `rawRequest: true`, the generated SWR hooks' types and implementation don't reflect the raw response shape and are always generated as if it were the normal response type (the plain functions on `getSdk()` do correctly handle raw responses). Combined with a recent `swr` (v2.x), this produces a type error, so this demo app excludes it from its scope.
- **`useSWRInfinite` pagination doesn't work under swr v2.x.** Clicking "load more" on the "useSWRInfinite" tab never updates `offset` and always refetches page 1's data (the React console also shows duplicate-key warnings). The cause: the fetcher the plugin generates (`generateFetcher` in `src/visitor.ts`) assumes a 3-argument call, `(id, fieldName, fieldValue)`. This relies on swr v1's behavior of spreading an array key into the fetcher's arguments; under swr v2.5.1 the key array is instead passed as a single argument (not spread), so `fieldName` / `fieldValue` end up `undefined` and `offset` never gets merged in.
- Next.js-specific SSR/SSG (`getStaticProps`, etc.) is not reproduced here.
