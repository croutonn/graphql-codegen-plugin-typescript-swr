import { GraphQLClient } from 'graphql-request'

export function createClient(headers?: Record<string, string>) {
  return new GraphQLClient('/graphql', headers ? { headers } : undefined)
}
