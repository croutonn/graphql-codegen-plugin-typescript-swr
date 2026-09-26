export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
  const utilsForInfinite = {
    generateGetKey: <Data = unknown, Variables = unknown>(
      id: SWRKeyInterface,
      getKey: SWRInfiniteKeyLoader<Data, Variables>
    ) => (pageIndex: number, previousData: Data | null) => {
      const key = getKey(pageIndex, previousData)
      return key ? [id, ...key] : null
    },
    generateFetcher: <Query = unknown, Variables = unknown>(query: (variables: Variables) => Promise<Query>, variables?: Variables) => (
        [id, fieldName, fieldValue]: [SWRKeyInterface, keyof Variables, Variables[keyof Variables] | null]
      ) => query({ ...variables, [fieldName]: fieldValue } as Variables)
  }
  const genKey = <V extends Record<string, unknown> = Record<string, unknown>>(name: string, object: V = {} as V): SWRKeyInterface => [name, ...Object.keys(object).sort().map(key => object[key])];
  return {
    ...sdk,
    useFeed(variables?: FeedQueryVariables, config?: SWRConfigInterface<FeedQuery, ClientError>, overrideKey?: (key: SWRKeyInterface) => SWRKeyInterface) {
      return useSWR<FeedQuery, ClientError>(overrideKey ? overrideKey(genKey<FeedQueryVariables>('Feed', variables)) : genKey<FeedQueryVariables>('Feed', variables), () => sdk.feed(variables), config);
    },
    useFeed2(variables: Feed2QueryVariables, config?: SWRConfigInterface<Feed2Query, ClientError>, overrideKey?: (key: SWRKeyInterface) => SWRKeyInterface) {
      return useSWR<Feed2Query, ClientError>(overrideKey ? overrideKey(genKey<Feed2QueryVariables>('Feed2', variables)) : genKey<Feed2QueryVariables>('Feed2', variables), () => sdk.feed2(variables), config);
    },
    useFeed2Infinite(getKey: SWRInfiniteKeyLoader<Feed2Query, Feed2QueryVariables>, variables: Feed2QueryVariables, config?: SWRInfiniteConfiguration<Feed2Query, ClientError>, overrideKey?: (key: SWRKeyInterface) => SWRKeyInterface) {
      return useSWRInfinite<Feed2Query, ClientError>(
        utilsForInfinite.generateGetKey<Feed2Query, Feed2QueryVariables>(overrideKey ? overrideKey(genKey<Feed2QueryVariables>('Feed2', variables)) : genKey<Feed2QueryVariables>('Feed2', variables), getKey),
        utilsForInfinite.generateFetcher<Feed2Query, Feed2QueryVariables>(sdk.feed2, variables),
        config);
    },
    useFeed3(variables?: Feed3QueryVariables, config?: SWRConfigInterface<Feed3Query, ClientError>, overrideKey?: (key: SWRKeyInterface) => SWRKeyInterface) {
      return useSWR<Feed3Query, ClientError>(overrideKey ? overrideKey(genKey<Feed3QueryVariables>('Feed3', variables)) : genKey<Feed3QueryVariables>('Feed3', variables), () => sdk.feed3(variables), config);
    },
    useFeed4(variables?: Feed4QueryVariables, config?: SWRConfigInterface<Feed4Query, ClientError>, overrideKey?: (key: SWRKeyInterface) => SWRKeyInterface) {
      return useSWR<Feed4Query, ClientError>(overrideKey ? overrideKey(genKey<Feed4QueryVariables>('Feed4', variables)) : genKey<Feed4QueryVariables>('Feed4', variables), () => sdk.feed4(variables), config);
    },
    useFeed4Infinite(getKey: SWRInfiniteKeyLoader<Feed4Query, Feed4QueryVariables>, variables?: Feed4QueryVariables, config?: SWRInfiniteConfiguration<Feed4Query, ClientError>, overrideKey?: (key: SWRKeyInterface) => SWRKeyInterface) {
      return useSWRInfinite<Feed4Query, ClientError>(
        utilsForInfinite.generateGetKey<Feed4Query, Feed4QueryVariables>(overrideKey ? overrideKey(genKey<Feed4QueryVariables>('Feed4', variables)) : genKey<Feed4QueryVariables>('Feed4', variables), getKey),
        utilsForInfinite.generateFetcher<Feed4Query, Feed4QueryVariables>(sdk.feed4, variables),
        config);
    }
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;
