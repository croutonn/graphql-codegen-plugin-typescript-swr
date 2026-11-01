import { GraphQLClient } from 'graphql-request'

export function createClient(headers?: Record<string, string>, endpoint = '/graphql') {
  return new GraphQLClient(endpoint, headers ? { headers } : undefined)
}
