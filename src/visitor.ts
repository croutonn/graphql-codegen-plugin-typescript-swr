import {
  ClientSideBasePluginConfig,
  ClientSideBaseVisitor,
  indentMultiline,
  LoadedFragment,
  ParsedConfig,
} from '@graphql-codegen/visitor-plugin-common'
import { GraphQLSchema, Kind, OperationDefinitionNode } from 'graphql'
import glob from 'micromatch'
import { pascalCase } from 'pascal-case'

import { RawSWRPluginConfig } from './config'

export interface SWRPluginConfig extends ClientSideBasePluginConfig {
  rawRequest: boolean
  excludeQueries: string | string[]
  useSWRInfinite: string | string[]
  autogenSWRKey: boolean
}

export interface Operation {
  node: OperationDefinitionNode
  documentVariableName: string
  operationType: string
  operationResultType: string
  operationVariablesTypes: string
}

export interface ComposeQueryHandlerConfig {
  autogenKey: SWRPluginConfig['autogenSWRKey']
  infinite: boolean
  rawRequest: SWRPluginConfig['rawRequest']
  typesPrefix: ParsedConfig['typesPrefix']
  typesSuffix: ParsedConfig['typesSuffix']
}

const composeQueryHandler = (
  operation: Operation,
  config: ComposeQueryHandlerConfig
): string[] => {
  const codes: string[] = []
  const { node } = operation
  const optionalVariables =
    !node.variableDefinitions ||
    node.variableDefinitions.length === 0 ||
    node.variableDefinitions.every(
      (v) => v.type.kind !== Kind.NON_NULL_TYPE || v.defaultValue
    )
      ? '?'
      : ''
  const name = node.name.value
  const pascalName = pascalCase(node.name.value)
  const responseType = config.rawRequest
    ? `SWRRawResponse<${operation.operationResultType}>`
    : operation.operationResultType
  const variablesType = operation.operationVariablesTypes

  codes.push(`use${pascalName}(${
    config.autogenKey ? '' : 'key: SWRKeyInterface, '
  }variables${optionalVariables}: ${variablesType}, config?: SWRConfigInterface<${responseType}, ClientError>) {
  return useSWR<${responseType}, ClientError>(${
    config.autogenKey
      ? `genKey<${variablesType}>('${pascalName}', variables)`
      : 'key'
  }, () => sdk.${name}(variables), config);
}`)

  if (config.infinite) {
    codes.push(`use${pascalName}Infinite(${
      config.autogenKey ? '' : 'id: string, '
    }getKey: ${config.typesPrefix}SWRInfiniteKeyLoader${
      config.typesSuffix
    }<${responseType}, ${variablesType}>, variables${optionalVariables}: ${variablesType}, config?: SWRInfiniteConfiguration<${responseType}, ClientError>) {
  return useSWRInfinite<${responseType}, ClientError>(
    utilsForInfinite.generateGetKey<${responseType}, ${variablesType}>(${
      config.autogenKey
        ? `genKey<${variablesType}>('${pascalName}', variables)`
        : 'id'
    }, getKey),
    utilsForInfinite.generateFetcher<${responseType}, ${variablesType}>(sdk.${name}, variables),
    config);
}`)
  }

  return codes
}

export class SWRVisitor extends ClientSideBaseVisitor<
  RawSWRPluginConfig,
  SWRPluginConfig
> {
  private _operationsToInclude: Operation[] = []

  private _enabledInfinite = false

  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: RawSWRPluginConfig
  ) {
    super(schema, fragments, rawConfig, {
      excludeQueries: rawConfig.excludeQueries || null,
      useSWRInfinite: rawConfig.useSWRInfinite || null,
      autogenSWRKey: rawConfig.autogenSWRKey || false,
    })

    this._enabledInfinite =
      (this.config.useSWRInfinite &&
        typeof this.config.useSWRInfinite === 'string') ||
      (Array.isArray(this.config.useSWRInfinite) &&
        this.config.useSWRInfinite.length > 0)

    const typeImport = this.config.useTypeImports ? 'import type' : 'import'

    this._additionalImports.push(
      `${typeImport} { ClientError } from 'graphql-request/dist/types';`
    )

    if (this.config.useTypeImports) {
      if (this._enabledInfinite) {
        this._additionalImports.push(
          `import type { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`
        )
        this._additionalImports.push(
          `import type { SWRInfiniteConfiguration } from 'swr/infinite';`
        )
        this._additionalImports.push(`import useSWR from 'swr';`)
        this._additionalImports.push(
          `import useSWRInfinite from 'swr/infinite';`
        )
      } else {
        this._additionalImports.push(
          `import type { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`
        )
        this._additionalImports.push(`import useSWR from 'swr';`)
      }
    } else if (this._enabledInfinite) {
      this._additionalImports.push(
        `import useSWR, { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`
      )
      this._additionalImports.push(
        `import useSWRInfinite, { SWRInfiniteConfiguration } from 'swr/infinite';`
      )
    } else {
      this._additionalImports.push(
        `import useSWR, { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`
      )
    }
  }

  protected buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: string,
    operationResultType: string,
    operationVariablesTypes: string
  ): string {
    this._operationsToInclude.push({
      node,
      documentVariableName,
      operationType,
      operationResultType,
      operationVariablesTypes,
    })

    return null
  }

  public get sdkContent(): string {
    const codes: string[] = []
    const { config } = this
    const disabledexcludeQueries =
      !config.excludeQueries ||
      (Array.isArray(config.excludeQueries) && !config.excludeQueries.length)
    const allPossibleActions = this._operationsToInclude
      .filter((o) => {
        if (o.operationType !== 'Query') {
          return false
        }
        if (disabledexcludeQueries) {
          return true
        }
        return !glob.isMatch(o.node.name.value, config.excludeQueries)
      })
      .map((o) =>
        composeQueryHandler(o, {
          autogenKey: config.autogenSWRKey,
          infinite:
            this._enabledInfinite &&
            glob.isMatch(o.node.name.value, config.useSWRInfinite),
          rawRequest: config.rawRequest,
          typesPrefix: config.typesPrefix,
          typesSuffix: config.typesSuffix,
        })
      )
      .reduce((p, c) => p.concat(c), [])
      .map((s) => indentMultiline(s, 2))

    // Add type of SWRRawResponse
    if (config.rawRequest) {
      codes.push(
        `type SWRRawResponse<Data = any> = { data?: Data | undefined; extensions?: any; headers: Headers; status: number; errors?: GraphQLError[] | undefined; };`
      )
    }

    // Add type of SWRInfiniteKeyLoader
    if (this._enabledInfinite) {
      codes.push(`export type ${config.typesPrefix}SWRInfiniteKeyLoader${config.typesSuffix}<Data = unknown, Variables = unknown> = (
  index: number,
  previousPageData: Data | null
) => [keyof Variables, Variables[keyof Variables] | null] | null;`)
    }

    // Add getSdkWithHooks function
    codes.push(`export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);`)

    // Add the utility for useSWRInfinite
    if (this._enabledInfinite) {
      codes.push(`  const utilsForInfinite = {
    generateGetKey: <Data = unknown, Variables = unknown>(
      id: ${config.autogenSWRKey ? 'SWRKeyInterface' : 'string'},
      getKey: ${config.typesPrefix}SWRInfiniteKeyLoader${
        config.typesSuffix
      }<Data, Variables>
    ) => (pageIndex: number, previousData: Data | null) => {
      const key = getKey(pageIndex, previousData)
      return key ? [id, ...key] : null
    },
    generateFetcher: <Query = unknown, Variables = unknown>(query: (variables: Variables) => Promise<Query>, variables?: Variables) => (
        id: string,
        fieldName: keyof Variables,
        fieldValue: Variables[typeof fieldName]
      ) => query({ ...variables, [fieldName]: fieldValue } as Variables)
  }`)
    }

    // Add the function for auto-generation key for SWR
    if (config.autogenSWRKey) {
      codes.push(
        `  const genKey = <V extends Record<string, unknown> = Record<string, unknown>>(name: string, object: V = {} as V): SWRKeyInterface => [name, ...Object.keys(object).sort().map(key => object[key])];`
      )
    }

    // Add return statement for getSdkWithHooks function and close the function
    codes.push(`  return {
    ...sdk,
${allPossibleActions.join(',\n')}
  };
}`)

    // Add type of Sdk
    codes.push(
      `export type ${config.typesPrefix}SdkWithHooks${config.typesSuffix} = ReturnType<typeof getSdkWithHooks>;`
    )

    return codes.join('\n')
  }
}
