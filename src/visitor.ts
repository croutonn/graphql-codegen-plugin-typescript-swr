import {
  ClientSideBasePluginConfig,
  ClientSideBaseVisitor,
  DocumentMode,
  getConfigValue,
  indentMultiline,
  LoadedFragment,
} from '@graphql-codegen/visitor-plugin-common';
import autoBind from 'auto-bind';
import { GraphQLSchema, Kind, OperationDefinitionNode } from 'graphql';

import { RawSWRPluginConfig } from './config';

export interface SWRPluginConfig extends ClientSideBasePluginConfig {
  rawRequest: boolean;
}

export class SWRVisitor extends ClientSideBaseVisitor<
  RawSWRPluginConfig,
  SWRPluginConfig
> {}
