import { ClientSideBaseVisitor, indentMultiline, } from '@graphql-codegen/visitor-plugin-common';
import { Kind } from 'graphql';
import glob from 'micromatch';
import { pascalCase } from 'pascal-case';
const composeQueryHandler = (operation, config) => {
    const codes = [];
    const { node } = operation;
    const optionalVariables = !node.variableDefinitions ||
        node.variableDefinitions.length === 0 ||
        node.variableDefinitions.every((v) => v.type.kind !== Kind.NON_NULL_TYPE || v.defaultValue)
        ? '?'
        : '';
    const name = node.name.value;
    const pascalName = pascalCase(node.name.value);
    const responseType = config.rawRequest
        ? `SWRRawResponse<${operation.operationResultType}>`
        : operation.operationResultType;
    const variablesType = operation.operationVariablesTypes;
    codes.push(`use${pascalName}(${config.autogenKey ? '' : 'key: SWRKeyInterface, '}variables${optionalVariables}: ${variablesType}, config?: SWRConfigInterface<${responseType}, ClientError>, opt?: {customKey?: (generatedName:SWRKeyInterface) => SWRKeyInterface}) {
  return useSWR<${responseType}, ClientError>(${config.autogenKey
        ? `opt?.customKey ? opt.customKey(genKey<${variablesType}>('${pascalName}', variables)) : genKey<${variablesType}>('${pascalName}', variables)`
        : 'key'}, () => sdk.${name}(variables), config);
}`);
    if (config.infinite) {
        codes.push(`use${pascalName}Infinite(${config.autogenKey ? '' : 'id: string, '}getKey: ${config.typesPrefix}SWRInfiniteKeyLoader${config.typesSuffix}<${responseType}, ${variablesType}>, variables${optionalVariables}: ${variablesType}, config?: SWRInfiniteConfiguration<${responseType}, ClientError>) {
  return useSWRInfinite<${responseType}, ClientError>(
    utilsForInfinite.generateGetKey<${responseType}, ${variablesType}>(${config.autogenKey
            ? `genKey<${variablesType}>('${pascalName}', variables)`
            : 'id'}, getKey),
    utilsForInfinite.generateFetcher<${responseType}, ${variablesType}>(sdk.${name}, variables),
    config);
}`);
    }
    return codes;
};
export class SWRVisitor extends ClientSideBaseVisitor {
    _operationsToInclude = [];
    _enabledInfinite = false;
    constructor(schema, fragments, rawConfig) {
        super(schema, fragments, rawConfig, {
            excludeQueries: rawConfig.excludeQueries || null,
            useSWRInfinite: rawConfig.useSWRInfinite || null,
            autogenSWRKey: rawConfig.autogenSWRKey || false,
        });
        this._enabledInfinite =
            (this.config.useSWRInfinite &&
                typeof this.config.useSWRInfinite === 'string') ||
                (Array.isArray(this.config.useSWRInfinite) &&
                    this.config.useSWRInfinite.length > 0);
        const typeImport = this.config.useTypeImports ? 'import type' : 'import';
        this._additionalImports.push(`${typeImport} { ClientError } from 'graphql-request/dist/types';`);
        if (this.config.useTypeImports) {
            if (this._enabledInfinite) {
                this._additionalImports.push(`import type { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`);
                this._additionalImports.push(`import type { SWRInfiniteConfiguration } from 'swr/infinite';`);
                this._additionalImports.push(`import useSWR from 'swr';`);
                this._additionalImports.push(`import useSWRInfinite from 'swr/infinite';`);
            }
            else {
                this._additionalImports.push(`import type { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`);
                this._additionalImports.push(`import useSWR from 'swr';`);
            }
        }
        else if (this._enabledInfinite) {
            this._additionalImports.push(`import useSWR, { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`);
            this._additionalImports.push(`import useSWRInfinite, { SWRInfiniteConfiguration } from 'swr/infinite';`);
        }
        else {
            this._additionalImports.push(`import useSWR, { SWRConfiguration as SWRConfigInterface, Key as SWRKeyInterface } from 'swr';`);
        }
    }
    buildOperation(node, documentVariableName, operationType, operationResultType, operationVariablesTypes) {
        this._operationsToInclude.push({
            node,
            documentVariableName,
            operationType,
            operationResultType,
            operationVariablesTypes,
        });
        return null;
    }
    get sdkContent() {
        const codes = [];
        const { config } = this;
        const disabledexcludeQueries = !config.excludeQueries ||
            (Array.isArray(config.excludeQueries) && !config.excludeQueries.length);
        const allPossibleActions = this._operationsToInclude
            .filter((o) => {
            if (o.operationType !== 'Query') {
                return false;
            }
            if (disabledexcludeQueries) {
                return true;
            }
            return !glob.isMatch(o.node.name.value, config.excludeQueries);
        })
            .map((o) => composeQueryHandler(o, {
            autogenKey: config.autogenSWRKey,
            infinite: this._enabledInfinite &&
                glob.isMatch(o.node.name.value, config.useSWRInfinite),
            rawRequest: config.rawRequest,
            typesPrefix: config.typesPrefix,
            typesSuffix: config.typesSuffix,
        }))
            .reduce((p, c) => p.concat(c), [])
            .map((s) => indentMultiline(s, 2));
        // Add type of SWRRawResponse
        if (config.rawRequest) {
            codes.push(`type SWRRawResponse<Data = any> = { data?: Data | undefined; extensions?: any; headers: Headers; status: number; errors?: GraphQLError[] | undefined; };`);
        }
        // Add type of SWRInfiniteKeyLoader
        if (this._enabledInfinite) {
            codes.push(`export type ${config.typesPrefix}SWRInfiniteKeyLoader${config.typesSuffix}<Data = unknown, Variables = unknown> = (
  index: number,
  previousPageData: Data | null
) => [keyof Variables, Variables[keyof Variables] | null] | null;`);
        }
        // Add getSdkWithHooks function
        codes.push(`export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);`);
        // Add the utility for useSWRInfinite
        if (this._enabledInfinite) {
            codes.push(`  const utilsForInfinite = {
    generateGetKey: <Data = unknown, Variables = unknown>(
      id: string,
      getKey: ${config.typesPrefix}SWRInfiniteKeyLoader${config.typesSuffix}<Data, Variables>
    ) => (pageIndex: number, previousData: Data | null) => {
      const key = getKey(pageIndex, previousData)
      return key ? [id, ...key] : null
    },
    generateFetcher: <Query = unknown, Variables = unknown>(query: (variables: Variables) => Promise<Query>, variables?: Variables) => (
        id: string,
        fieldName: keyof Variables,
        fieldValue: Variables[typeof fieldName]
      ) => query({ ...variables, [fieldName]: fieldValue } as Variables)
  }`);
        }
        // Add the function for auto-generation key for SWR
        if (config.autogenSWRKey) {
            codes.push(`  const genKey = <V extends Record<string, unknown> = Record<string, unknown>>(name: string, object: V = {} as V): SWRKeyInterface => [name, ...Object.keys(object).sort().map(key => object[key])];`);
        }
        // Add return statement for getSdkWithHooks function and close the function
        codes.push(`  return {
    ...sdk,
${allPossibleActions.join(',\n')}
  };
}`);
        // Add type of Sdk
        codes.push(`export type ${config.typesPrefix}SdkWithHooks${config.typesSuffix} = ReturnType<typeof getSdkWithHooks>;`);
        return codes.join('\n');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92aXNpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFFTCxxQkFBcUIsRUFDckIsZUFBZSxHQUdoQixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBaUIsSUFBSSxFQUEyQixNQUFNLFNBQVMsQ0FBQTtBQUN0RSxPQUFPLElBQUksTUFBTSxZQUFZLENBQUE7QUFDN0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQTJCeEMsTUFBTSxtQkFBbUIsR0FBRyxDQUMxQixTQUFvQixFQUNwQixNQUFpQyxFQUN2QixFQUFFO0lBQ1osTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFBO0lBQzFCLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxTQUFTLENBQUE7SUFDMUIsTUFBTSxpQkFBaUIsR0FDckIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CO1FBQ3pCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUNyQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUM1QixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUM1RDtRQUNDLENBQUMsQ0FBQyxHQUFHO1FBQ0wsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNSLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQzVCLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzlDLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxVQUFVO1FBQ3BDLENBQUMsQ0FBQyxrQkFBa0IsU0FBUyxDQUFDLG1CQUFtQixHQUFHO1FBQ3BELENBQUMsQ0FBQyxTQUFTLENBQUMs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