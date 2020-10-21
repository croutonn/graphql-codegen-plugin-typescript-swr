import { Types, mergeOutputs } from '@graphql-codegen/plugin-helpers'
import { validateTs } from '@graphql-codegen/testing'
import {
  plugin as tsPlugin,
  TypeScriptPluginConfig,
} from '@graphql-codegen/typescript'
import { plugin as graphQLRequestPlugin } from '@graphql-codegen/typescript-graphql-request'
import { GraphQLRequestPluginConfig } from '@graphql-codegen/typescript-graphql-request/visitor'
import {
  plugin as tsDocumentsPlugin,
  TypeScriptDocumentsPluginConfig,
} from '@graphql-codegen/typescript-operations'
import { parse, GraphQLSchema, buildClientSchema } from 'graphql'

import { RawSWRPluginConfig } from '../src/config'
import { plugin } from '../src/index'

type PluginsConfig = Partial<
  TypeScriptPluginConfig &
    TypeScriptDocumentsPluginConfig &
    GraphQLRequestPluginConfig &
    RawSWRPluginConfig
>

describe('SWR', () => {
  const schema = buildClientSchema(require('../dev-test/githunt/schema.json'))

  const basicDoc = parse(/* GraphQL */ `
    query feed {
      feed {
        id
        commentCount
        repository {
          owner {
            avatar_url
          }
        }
      }
    }
    query feed2($v: String!) {
      feed {
        id
      }
    }
    query feed3($v: String) {
      feed {
        id
      }
    }
    query feed4($v: String! = "TEST") {
      feed {
        id
      }
    }
  `)

  const basicUsage = `
async function test() {
  const client = new GraphQLClient('');
  const sdk = getSdkWithHooks(client);

  await sdk.feed();
  await sdk.feed3();
  await sdk.feed4();
  const result = await sdk.feed2({ v: "1" });
  if (result.feed) {
    if (result.feed[0]) {
      const id = result.feed[0].id
    }
  }
}`

  const validate = async (
    content: Types.PluginOutput,
    config: PluginsConfig,
    docs: Types.DocumentFile[],
    pluginSchema: GraphQLSchema,
    usage: string
  ) => {
    const m = mergeOutputs([
      await tsPlugin(pluginSchema, docs, config, { outputFile: '' }),
      await tsDocumentsPlugin(pluginSchema, docs, config),
      await graphQLRequestPlugin(pluginSchema, docs, config),
      content,
      usage,
    ])

    await validateTs(m)

    return m
  }

  describe('sdk', () => {
    it('Should generate import declarations of output correctly', async () => {
      const config: PluginsConfig = {}
      const docs = [{ location: '', document: basicDoc }]
      const usage = ``

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.ts',
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import useSWR, { ConfigInterface as SWRConfigInterface, keyInterface as SWRKeyInterface } from 'swr';`
      )

      await validate(content, config, docs, schema, usage)
    })

    it('Should support useTypeImports', async () => {
      const config: PluginsConfig = { useTypeImports: true }
      const docs = [{ location: '', document: basicDoc }]
      const usage = ``

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.ts',
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(`import useSWR from 'swr';`)
      expect(content.prepend).toContain(
        `import type { ConfigInterface as SWRConfigInterface, keyInterface as SWRKeyInterface } from 'swr';`
      )

      await validate(content, config, docs, schema, usage)
    })
  })

  describe('plugin-typescript-swr', () => {
    it('Should generate Hooks API of output correctly', async () => {
      const config: PluginsConfig = {}
      const docs = [{ location: '', document: basicDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.ts',
      })) as Types.ComplexPluginOutput

      const usage = basicUsage
      const output = await validate(content, config, docs, schema, usage)
      expect(output).toContain(
        `export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
  return {
    ...sdk,
    useFeed(key: SWRKeyInterface, variables?: FeedQueryVariables, config?: SWRConfigInterface<FeedQuery>) {
      return useSWR<FeedQuery>(key, () => sdk.feed(variables), config);
    },
    useFeed2(key: SWRKeyInterface, variables: Feed2QueryVariables, config?: SWRConfigInterface<Feed2Query>) {
      return useSWR<Feed2Query>(key, () => sdk.feed2(variables), config);
    },
    useFeed3(key: SWRKeyInterface, variables?: Feed3QueryVariables, config?: SWRConfigInterface<Feed3Query>) {
      return useSWR<Feed3Query>(key, () => sdk.feed3(variables), config);
    },
    useFeed4(key: SWRKeyInterface, variables?: Feed4QueryVariables, config?: SWRConfigInterface<Feed4Query>) {
      return useSWR<Feed4Query>(key, () => sdk.feed4(variables), config);
    }
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;`
      )
    })

    it('Should generate the output from which mutation operation has been removed', async () => {
      const config: PluginsConfig = {}
      const document = parse(/* GraphQL */ `
        query feed {
          feed {
            id
            commentCount
            repository {
              owner {
                avatar_url
              }
            }
          }
        }
        query feed2($v: String!) {
          feed {
            id
          }
        }
        query feed3($v: String) {
          feed {
            id
          }
        }
        query feed4($v: String! = "TEST") {
          feed {
            id
          }
        }
        mutation submitComment(
          $repoFullName: String!
          $commentContent: String!
        ) {
          submitComment(
            repoFullName: $repoFullName
            commentContent: $commentContent
          ) {
            ...CommentsPageComment
          }
        }
        fragment CommentsPageComment on Comment {
          id
          postedBy {
            login
            html_url
          }
          createdAt
          content
        }
      `)
      const docs = [{ location: '', document }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.ts',
      })) as Types.ComplexPluginOutput

      const usage = basicUsage
      const output = await validate(content, config, docs, schema, usage)
      expect(output).toContain(
        `export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
  return {
    ...sdk,
    useFeed(key: SWRKeyInterface, variables?: FeedQueryVariables, config?: SWRConfigInterface<FeedQuery>) {
      return useSWR<FeedQuery>(key, () => sdk.feed(variables), config);
    },
    useFeed2(key: SWRKeyInterface, variables: Feed2QueryVariables, config?: SWRConfigInterface<Feed2Query>) {
      return useSWR<Feed2Query>(key, () => sdk.feed2(variables), config);
    },
    useFeed3(key: SWRKeyInterface, variables?: Feed3QueryVariables, config?: SWRConfigInterface<Feed3Query>) {
      return useSWR<Feed3Query>(key, () => sdk.feed3(variables), config);
    },
    useFeed4(key: SWRKeyInterface, variables?: Feed4QueryVariables, config?: SWRConfigInterface<Feed4Query>) {
      return useSWR<Feed4Query>(key, () => sdk.feed4(variables), config);
    }
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;`
      )
    })

    it('Should work `excludeQueries` option correctly', async () => {
      const config: PluginsConfig = {
        excludeQueries: ['feed[2-3]', 'hoge', 'foo'],
      }
      const docs = [{ location: '', document: basicDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.ts',
      })) as Types.ComplexPluginOutput

      const usage = basicUsage
      const output = await validate(content, config, docs, schema, usage)
      expect(output).toContain(
        `export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
  return {
    ...sdk,
    useFeed(key: SWRKeyInterface, variables?: FeedQueryVariables, config?: SWRConfigInterface<FeedQuery>) {
      return useSWR<FeedQuery>(key, () => sdk.feed(variables), config);
    },
    useFeed4(key: SWRKeyInterface, variables?: Feed4QueryVariables, config?: SWRConfigInterface<Feed4Query>) {
      return useSWR<Feed4Query>(key, () => sdk.feed4(variables), config);
    }
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;`
      )
    })

    it('Should work `useSWRInfinite` option correctly', async () => {
      const config: PluginsConfig = {
        useSWRInfinite: ['feed[24]'],
      }
      const docs = [{ location: '', document: basicDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.ts',
      })) as Types.ComplexPluginOutput

      const usage = basicUsage
      const output = await validate(content, config, docs, schema, usage)
      expect(content.prepend).toContain(
        `import useSWR, { useSWRInfinite, ConfigInterface as SWRConfigInterface, keyInterface as SWRKeyInterface, SWRInfiniteConfigInterface } from 'swr';`
      )
      expect(output).toContain(
        `export type SWRInfiniteKeyLoader<Data = any> = (
  index: number,
  previousPageData: Data | null
) => string | any[] | null;
export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
  return {
    ...sdk,
    useFeed(key: SWRKeyInterface, variables?: FeedQueryVariables, config?: SWRConfigInterface<FeedQuery>) {
      return useSWR<FeedQuery>(key, () => sdk.feed(variables), config);
    },
    useFeed2(key: SWRKeyInterface, variables: Feed2QueryVariables, config?: SWRConfigInterface<Feed2Query>) {
      return useSWR<Feed2Query>(key, () => sdk.feed2(variables), config);
    },
    useFeed2Infinite(getKey: SWRInfiniteKeyLoader<Feed2Query>, variables: Feed2QueryVariables, config?: SWRInfiniteConfigInterface<Feed2Query>) {
      return useSWRInfinite<Feed2Query>(getKey, () => sdk.feed2(variables), config);
    },
    useFeed3(key: SWRKeyInterface, variables?: Feed3QueryVariables, config?: SWRConfigInterface<Feed3Query>) {
      return useSWR<Feed3Query>(key, () => sdk.feed3(variables), config);
    },
    useFeed4(key: SWRKeyInterface, variables?: Feed4QueryVariables, config?: SWRConfigInterface<Feed4Query>) {
      return useSWR<Feed4Query>(key, () => sdk.feed4(variables), config);
    },
    useFeed4Infinite(getKey: SWRInfiniteKeyLoader<Feed4Query>, variables?: Feed4QueryVariables, config?: SWRInfiniteConfigInterface<Feed4Query>) {
      return useSWRInfinite<Feed4Query>(getKey, () => sdk.feed4(variables), config);
    }
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;`
      )
    })
  })
})
