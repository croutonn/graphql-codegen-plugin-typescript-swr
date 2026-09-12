import fs from 'fs'
import { resolve } from 'path'

import { Types, mergeOutputs } from '@graphql-codegen/plugin-helpers'
import { validateTs } from '@graphql-codegen/testing'
import {
  plugin as tsPlugin,
  TypeScriptPluginConfig,
} from '@graphql-codegen/typescript'
import { plugin as graphQLRequestPlugin } from '@graphql-codegen/typescript-graphql-request'
import {
  plugin as tsDocumentsPlugin,
  TypeScriptDocumentsPluginConfig,
} from '@graphql-codegen/typescript-operations'
import { parse, GraphQLSchema, buildClientSchema } from 'graphql'
import ts from 'typescript'

import { RawSWRPluginConfig } from '../src/config'
import { plugin } from '../src/index'

type GraphQLRequestPluginConfig = {
  rawRequest: boolean
  extensionsType: string
}

type PluginsConfig = Partial<
  TypeScriptPluginConfig &
    TypeScriptDocumentsPluginConfig &
    GraphQLRequestPluginConfig &
    RawSWRPluginConfig
>

const readOutput = (name: string): string =>
  fs.readFileSync(resolve(__dirname, `./outputs/${name}.ts`), 'utf-8')

/**
 * The test-only `mergeOutputs` helper concatenates each plugin's `prepend`
 * array without deduping, unlike real codegen output, so e.g. `import gql
 * from 'graphql-tag'` appears once per plugin that needs it. Real semantic
 * compilation (unlike the syntax-only `validateTs`) rejects that as a
 * duplicate identifier, so collapse repeated import lines first.
 */
const dedupeImportLines = (source: string): string => {
  const seenImports = new Set<string>()
  return source
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed.startsWith('import ')) return true
      if (seenImports.has(trimmed)) return false
      seenImports.add(trimmed)
      return true
    })
    .join('\n')
}

/**
 * `validateTs` from `@graphql-codegen/testing` only parses syntax by
 * default; it never resolves imports or checks assignability, so it can't
 * catch a fetcher-return-type mismatch against `swr`'s own typings. This
 * compiles the given source for real, resolving `swr` / `graphql-request`
 * from this package's actual installed node_modules, to confirm generated
 * hooks stay assignable to `useSWR`'s real (version-pinned) signature.
 */
const typeCheckAgainstInstalledDependencies = (rawSource: string): string[] => {
  const source = dedupeImportLines(rawSource)
  const fileName = resolve(__dirname, '__typecheck__.ts')
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    esModuleInterop: true,
    skipLibCheck: true,
    types: [],
    lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
    noEmit: true,
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (name, languageVersion, ...rest) =>
    resolve(name) === fileName
      ? ts.createSourceFile(name, source, languageVersion, true)
      : getSourceFile(name, languageVersion, ...rest)
  host.writeFile = () => {}
  const program = ts.createProgram([fileName], options, host)
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n'
    )
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      )
      return `${line + 1}: ${message}`
    }
    return message
  })
}

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

  const rawUsage = `
async function test() {
  const client = new GraphQLClient('');
  const sdk = getSdkWithHooks(client);

  await sdk.feed();
  await sdk.feed3();
  await sdk.feed4();
  const result = await sdk.feed2({ v: "1" });
  if (result.data?.feed) {
    if (result.data.feed[0]) {
      const id = result.data.feed[0].id
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

    const usage = rawUsage
    const output = await validate(content, config, docs, schema, usage)
    expect(output).toContain("import { ClientError } from 'graphql-request'")
    expect(output).toContain(readOutput('rawRequest'))

    // `validateTs` above only checks syntax; it can't catch a hook's fetcher
    // being unassignable to swr's actual `useSWR` signature (the #235 bug).
    // Compile against the real installed `swr` / `graphql-request` typings.
    expect(typeCheckAgainstInstalledDependencies(output)).toEqual([])
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
