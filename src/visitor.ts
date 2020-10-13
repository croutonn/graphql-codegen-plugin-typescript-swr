import {
  ClientSideBasePluginConfig,
  ClientSideBaseVisitor,
  indentMultiline,
  LoadedFragment,
} from '@graphql-codegen/visitor-plugin-common'
import autoBind from 'auto-bind'
import { GraphQLSchema, Kind, OperationDefinitionNode } from 'graphql'
import { pascalCase } from 'pascal-case'

import { RawSWRPluginConfig } from './config'

export interface SWRPluginConfig extends ClientSideBasePluginConfig {
  rawRequest: boolean
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

  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: RawSWRPluginConfig
  ) {
    super(schema, fragments, rawConfig, {})

    autoBind(this)

    if (this.config.useTypeImports) {
      this._additionalImports.push(
        `import type { ConfigInterface as SWRConfigInterface, keyInterface as SWRKeyInterface } from 'swr';`
      )
      this._additionalImports.push(`import useSWR from 'swr';`)
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
    const allPossibleActions = this._operationsToInclude
      .map((o) => {
        const optionalVariables =
          !o.node.variableDefinitions ||
          o.node.variableDefinitions.length === 0 ||
          o.node.variableDefinitions.every(
            (v) => v.type.kind !== Kind.NON_NULL_TYPE || v.defaultValue
          )

        if (this.config.rawRequest) {
          return `use${pascalCase(
            o.node.name.value
          )}(key: SWRKeyInterface, variables${optionalVariables ? '?' : ''}: ${
            o.operationVariablesTypes
          }, config?: SWRConfigInterface<${o.operationResultType}>) {
            return useSWR<{ data?: ${
              o.operationResultType
            } | undefined; extensions?: any; headers: Headers; status: number; errors?: GraphQLError[] | undefined; }>(key, () => sdk.${
            o.node.name.value
          }(variables), config);
        }`
        }

        return `use${pascalCase(
          o.node.name.value
        )}(key: SWRKeyInterface, variables${optionalVariables ? '?' : ''}: ${
          o.operationVariablesTypes
        }, config?: SWRConfigInterface<${o.operationResultType}>) {
  return useSWR<${o.operationResultType}>(key, () => sdk.${
          o.node.name.value
        }(variables), config);
}`
      })
      .map((s) => indentMultiline(s, 2))

    return `export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
  return {
    ...sdk,
${allPossibleActions.join(',\n')}
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;`
  }
}
