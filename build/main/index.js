"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWRVisitor = exports.validate = exports.plugin = void 0;
const path_1 = require("path");
const graphql_1 = require("graphql");
const visitor_1 = require("./visitor");
Object.defineProperty(exports, "SWRVisitor", { enumerable: true, get: function () { return visitor_1.SWRVisitor; } });
const plugin = (schema, documents, config) => {
    const allAst = (0, graphql_1.concatAST)(documents.map((v) => v.document));
    const allFragments = [
        // prettier-ignore
        ...allAst.definitions.filter((d) => d.kind === graphql_1.Kind.FRAGMENT_DEFINITION).map((fragmentDef) => ({
            node: fragmentDef,
            name: fragmentDef.name.value,
            onType: fragmentDef.typeCondition.name.value,
            isExternal: false,
        })),
        ...(config.externalFragments || []),
    ];
    const visitor = new visitor_1.SWRVisitor(schema, allFragments, config);
    (0, graphql_1.visit)(allAst, { leave: visitor });
    return {
        prepend: visitor.getImports(),
        content: visitor.sdkContent,
    };
};
exports.plugin = plugin;
const validate = async (_schema, _documents, _config, outputFile) => {
    if ((0, path_1.extname)(outputFile) !== '.ts') {
        throw new Error(`Plugin "typescript-swr" requires extension to be ".ts"!`);
    }
};
exports.validate = validate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQThCO0FBUTlCLHFDQU1nQjtBQUdoQix1Q0FBc0M7QUF5QzdCLDJGQXpDQSxvQkFBVSxPQXlDQTtBQXZDWixNQUFNLE1BQU0sR0FBdUMsQ0FDeEQsTUFBcUIsRUFDckIsU0FBK0IsRUFDL0IsTUFBMEIsRUFDMUIsRUFBRTtJQUNGLE1BQU0sTUFBTSxHQUFHLElBQUEsbUJBQVMsRUFBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUUxRCxNQUFNLFlBQVksR0FBcUI7UUFDckMsa0JBQWtCO1FBQ2xCLEdBQUksTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQzNCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLGNBQUksQ0FBQyxtQkFBbUIsQ0FDZCxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNuRCxJQUFJLEVBQUUsV0FBVztZQUNqQixJQUFJLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLO1lBQzVCLE1BQU0sRUFBRSxXQUFXLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLO1lBQzVDLFVBQVUsRUFBRSxLQUFLO1NBQ2xCLENBQUMsQ0FBQztRQUNILEdBQUcsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO0tBQ3BDLENBQUE7SUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLG9CQUFVLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUM1RCxJQUFBLGVBQUssRUFBQyxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUNqQyxPQUFPO1FBQ0wsT0FBTyxFQUFFLE9BQU8sQ0FBQyxVQUFVLEVBQUU7UUFDN0IsT0FBTyxFQUFFLE9BQU8sQ0FBQyxVQUFVO0tBQzVCLENBQUE7QUFDSCxDQUFDLENBQUE7QUExQlksUUFBQSxNQUFNLFVBMEJsQjtBQUVNLE1BQU0sUUFBUSxHQUEwQixLQUFLLEVBQ2xELE9BQXNCLEVBQ3RCLFVBQWdDLEVBQ2hDLE9BQTJCLEVBQzNCLFVBQWtCLEVBQ2xCLEVBQUU7SUFDRixJQUFJLElBQUEsY0FBTyxFQUFDLFVBQVUsQ0FBQyxLQUFLLEtBQUssRUFBRTtRQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUE7S0FDM0U7QUFDSCxDQUFDLENBQUE7QUFUWSxRQUFBLFFBQVEsWUFTcEIifQ==