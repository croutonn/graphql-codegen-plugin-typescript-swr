import { RawClientSideBasePluginConfig } from '@graphql-codegen/visitor-plugin-common'

/**
 * @description This plugin generates [`graphql-request`](https://www.npmjs.com/package/graphql-request) ready-to-use SDK, which is fully-typed.
 */

export interface RawSWRPluginConfig extends RawClientSideBasePluginConfig {
  /**
   * @description By default the `request` method return the `data` or `errors` key from the response. If you need to access the `extensions` key you can use the `rawRequest` method.
   * @default false
   *
   * @exampleMarkdown
   * ```yml
   * generates:
   *   path/to/file.ts:
   *     plugins:
   *       - typescript
   *       - typescript-operations
   *       - typescript-graphql-request
   *       - graphql-codegen-plugin-typescript-swr
   * config:
   *   rawRequest: true
   * ```
   */
  rawRequest?: boolean
  excludeQueries?: string | string[]
  useSWRInfinite?: string | string[]
  autogenSWRKey?: boolean
}
