import {
  ClientSideBasePluginConfig,
  ClientSideBaseVisitor,
  indentMultiline,
  LoadedFragment,
} from '@graphql-codegen/visitor-plugin-common'
import autoBind from 'auto-bind'
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

export class SWRVisitor extends ClientSideBaseVisitor<
  RawSWRPluginConfig,
  SWRPluginConfig
> {
  private _operationsToInclude: {
    node: OperationDefinitionNode
    documentVariableName: string
    operationType: string
    operationResultType: string
    operationVariablesTypes: string
  }[] = []

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

    autoBind(this)

    if (this.config.useTypeImports) {
      if (this._enabledInfinite) {
        this._additionalImports.push(
          `import type { ConfigInterface as SWRConfigInterface, keyInterface as SWRKeyInterface, SWRInfiniteConfigInterface } from 'swr';`
        )
        this._additionalImports.push(
          `import useSWR, { useSWRInfinite } from 'swr';`
        )
      } else {
        this._additionalImports.push(
          `import type { ConfigInterface as SWRConfigInterface, keyInterface as SWRKeyInterface } from 'swr';`
        )
        this._additionalImports.push(`import useSWR from 'swr';`)
      }
    } else if (this._enabledInfinite) {
      this._additionalImports.push(
        `import useSWR, { useSWRInfinite, ConfigInterface as SWRConfigInterface, keyInterface as SWRKeyInterface, SWRInfiniteConfigInterface } from 'swr';`
      )
    } else {
      this._additionalImports.push(
        `import useSWR, { ConfigInterface as SWRConfigInterface, keyInterface as SWRKeyInterface } from 'swr';`
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
    const { excludeQueries, autogenSWRKey } = this.config
    const disabledexcludeQueries =
      !excludeQueries ||
      (Array.isArray(excludeQueries) && !excludeQueries.length)
    const allPossibleActions = this._operationsToInclude
      .filter((o) => {
        if (o.operationType !== 'Query') {
          return false
        }
        if (disabledexcludeQueries) {
          return true
        }
        const name = o.node.name.value
        return !glob.isMatch(name, excludeQueries)
      })
      .map((o) => {
        const optionalVariables =
          !o.node.variableDefinitions ||
          o.node.variableDefinitions.length === 0 ||
          o.node.variableDefinitions.every(
            (v) => v.type.kind !== Kind.NON_NULL_TYPE || v.defaultValue
          )
        const name = o.node.name.value
        const pascalName = pascalCase(o.node.name.value)
        const enabledInfinite =
          this._enabledInfinite &&
          glob.isMatch(name, this.config.useSWRInfinite)
        const codes: string[] = []

        if (this.config.rawRequest) {
          codes.push(`use${pascalCase(o.node.name.value)}(${
            autogenSWRKey ? '' : 'key: SWRKeyInterface, '
          }variables${optionalVariables ? '?' : ''}: ${
            o.operationVariablesTypes
          }, config?: SWRConfigInterface<SWRRawResponse<${
            o.operationResultType
          }>}>) {
            return useSWR<SWRRawResponse<${o.operationResultType}>>(${
            autogenSWRKey
              ? `genKey<${o.operationVariablesTypes}>('${pascalName}', variables)`
              : 'key'
          }, () => sdk.${o.node.name.value}(variables), config);
        }`)

          if (enabledInfinite) {
            codes.push(`use${pascalCase(
              o.node.name.value
            )}Infinite(getKey: SWRInfiniteKeyLoader<SWRRawResponse<${
              o.operationResultType
            }>>, variables${optionalVariables ? '?' : ''}: ${
              o.operationVariablesTypes
            }, config?: SWRInfiniteConfigInterface<SWRRawResponse<${
              o.operationResultType
            }>>) {
            return useSWRInfinite<SWRRawResponse<${
              o.operationResultType
            }>>(getKey, () => sdk.${o.node.name.value}(variables), config);
        }`)
          }
          return codes
        }

        codes.push(`use${pascalName}(${
          autogenSWRKey ? '' : 'key: SWRKeyInterface, '
        }variables${optionalVariables ? '?' : ''}: ${
          o.operationVariablesTypes
        }, config?: SWRConfigInterface<${o.operationResultType}>) {
  return useSWR<${o.operationResultType}>(${
          autogenSWRKey
            ? `genKey<${o.operationVariablesTypes}>('${pascalName}', variables)`
            : 'key'
        }, () => sdk.${o.node.name.value}(variables), config);
}`)

        if (enabledInfinite) {
          codes.push(`use${pascalCase(
            o.node.name.value
          )}Infinite(id: string, getKey: SWRInfiniteKeyLoader<${
            o.operationResultType
          }, ${o.operationVariablesTypes}>, variables${
            optionalVariables ? '?' : ''
          }: ${
            o.operationVariablesTypes
          }, config?: SWRInfiniteConfigInterface<${o.operationResultType}>) {
  return useSWRInfinite<${o.operationResultType}>(
    utilsForInfinite.generateGetKey<${o.operationResultType}, ${
            o.operationVariablesTypes
          }>(id, getKey),
    utilsForInfinite.generateFetcher<${o.operationResultType}, ${
            o.operationVariablesTypes
          }>(sdk.${o.node.name.value}, variables),
    config);
}`)
        }

        return codes
      })
      .reduce((p, c) => p.concat(c), [])
      .map((s) => indentMultiline(s, 2))

    const types: string[] = []
    if (this.config.rawRequest) {
      types.push(
        `type SWRRawResponse<Data = any> = { data?: Data | undefined; extensions?: any; headers: Headers; status: number; errors?: GraphQLError[] | undefined; };`
      )
    }
    if (this._enabledInfinite) {
      types.push(`export type SWRInfiniteKeyLoader<Data = unknown, Variables = unknown> = (
  index: number,
  previousPageData: Data | null
) => [keyof Variables, Variables[keyof Variables] | null] | null;`)
    }

    return `${types.join('\n')}
export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
${
  this._enabledInfinite
    ? `  const utilsForInfinite = {
    generateGetKey: <Data = unknown, Variables = unknown>(
      id: string,
      getKey: SWRInfiniteKeyLoader<Data, Variables>
    ) => (pageIndex: number, previousData: Data | null) => {
      const key = getKey(pageIndex, previousData)
      return key ? [id, ...key] : null
    },
    generateFetcher: <Query = unknown, Variables = unknown>(query: (variables: Variables) => Promise<Query>, variables?: Variables) => (
        fieldName: keyof Variables,
        fieldValue: Variables[typeof fieldName]
      ) => query({ ...variables, [fieldName]: fieldValue } as Variables)
  }\n`
    : ''
}${
      autogenSWRKey
        ? '  const genKey = <V extends Record<string, unknown> = Record<string, unknown>>(name: string, object: V = {} as V): SWRKeyInterface => [name, ...Object.keys(object).sort().map(key => object[key])];\n'
        : ''
    }  return {
    ...sdk,
${allPossibleActions.join(',\n')}
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;`
  }
}
