import { PluginValidateFn, PluginFunction } from '@graphql-codegen/plugin-helpers';
import { RawSWRPluginConfig } from './config';
import { SWRVisitor } from './visitor';
export declare const plugin: PluginFunction<RawSWRPluginConfig>;
export declare const validate: PluginValidateFn<any>;
export { SWRVisitor };
