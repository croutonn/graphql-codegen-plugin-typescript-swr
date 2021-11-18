import { GraphQLSchema } from 'graphql';
import { SWRVisitor } from '../src/visitor'

describe('SWRVisitor', () => {
  describe('sdkContent', () => {
      it('should export SWRInfiniteKeyLoader', () => {
          const schema = new GraphQLSchema({
          })
          const visitor = new SWRVisitor(
                schema,
                [],
                {
                    useSWRInfinite: ['_query_']
                }
          )
          expect(visitor.sdkContent).toContain('export type SWRInfiniteKeyLoader<Data = unknown,')
      })
  })
});