import fs from 'fs'
import { resolve } from 'path'

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

const readOutput = (name: string): string =>
  fs.readFileSync(resolve(__dirname, `./outputs/${name}.ts`), 'utf-8')

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
        `import useSWR, { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`
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
        `import type { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`
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
      expect(output).toContain(readOutput('straight'))
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
      expect(output).toContain(readOutput('mutations'))
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
      expect(output).toContain(readOutput('excludeQueries'))
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
        `import useSWR, { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`
      )
      expect(content.prepend).toContain(
        `import useSWRInfinite, { SWRInfiniteConfiguration } from 'swr/infinite';`
      )
      expect(output).toContain(readOutput('infinite'))
    })
  })

  it('Should work `autogenSWRKey` option correctly', async () => {
    const config: PluginsConfig = {
      autogenSWRKey: true,
      useSWRInfinite: ['feed[24]'],
    }
    const docs = [{ location: '', document: basicDoc }]

    const content = (await plugin(schema, docs, config, {
      outputFile: 'graphql.ts',
    })) as Types.ComplexPluginOutput

    const usage = basicUsage
    const output = await validate(content, config, docs, schema, usage)
    expect(output).toContain(readOutput('autogenSWRKey'))
  })

  it('Should work `rawRequest` option correctly', async () => {
    const config: PluginsConfig = {
      rawRequest: true,
    }
    const docs = [{ location: '', document: basicDoc }]

    const content = (await plugin(schema, docs, config, {
      outputFile: 'graphql.ts',
    })) as Types.ComplexPluginOutput

    const usage = basicUsage
    const output = await validate(content, config, docs, schema, usage)
    expect(output).toContain(
      "import { ClientError } from 'graphql-request/dist/types'"
    )
    expect(output).toContain(readOutput('rawRequest'))
  })

  it('Should work `typesPrefix` and `typesSuffix` option correctly', async () => {
    const typesPrefix = 'P'
    const typesSuffix = 'S'
    const config: PluginsConfig = {
      typesPrefix,
      typesSuffix,
      useSWRInfinite: ['feed'],
    }
    const docs = [{ location: '', document: basicDoc }]

    const content = (await plugin(schema, docs, config, {
      outputFile: 'graphql.ts',
    })) as Types.ComplexPluginOutput

    const usage = basicUsage
    const output = await validate(content, config, docs, schema, usage)
    expect(output).toContain(
      `export type ${typesPrefix}SWRInfiniteKeyLoader${typesSuffix}<Data = unknown, Variables = unknown>`
    )
    expect(output).toContain(
      `getKey: ${typesPrefix}SWRInfiniteKeyLoader${typesSuffix}<${typesPrefix}FeedQuery${typesSuffix}, ${typesPrefix}FeedQueryVariables${typesSuffix}>`
    )
    expect(output).toContain(
      `export type ${typesPrefix}SdkWithHooks${typesSuffix} =`
    )
  })
})
