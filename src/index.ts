import { extname } from 'path';

import {
  Types,
  PluginValidateFn,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import {
  RawClientSideBasePluginConfig,
  LoadedFragment,
} from '@graphql-codegen/visitor-plugin-common';
import {
  visit,
  GraphQLSchema,
  concatAST,
  Kind,
  FragmentDefinitionNode,
} from 'graphql';

import { RawSWRPluginConfig } from './config';
import { SWRVisitor } from './visitor';

export const plugin: PluginFunction<RawSWRPluginConfig> = (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: RawGraphQLRequestPluginConfig
) => {
  const allAst = concatAST(documents.map((v) => v.document));
};

export const validate: PluginValidateFn<any> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: RawClientSideBasePluginConfig,
  outputFile: string
) => {
  if (extname(outputFile) !== '.ts') {
    throw new Error(`Plugin "typescript-swr" requires extension to be ".ts"!`);
  }
};

export { SWRVisitor };
