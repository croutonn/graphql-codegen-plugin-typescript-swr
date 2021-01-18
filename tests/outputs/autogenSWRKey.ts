export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
  const utilsForInfinite = {
    generateGetKey: <Data = unknown, Variables = unknown>(
      id: string,
      getKey: SWRInfiniteKeyLoader<Data, Variables>
    ) => (pageIndex: number, previousData: Data | null) => {
      const key = getKey(pageIndex, previousData)
      return key ? [id, ...key] : null
    },
    generateFetcher: <Query = unknown, Variables = unknown>(query: (variables: Variables) => Promise<Query>, variables?: Variables) => (
        id: string,
        fieldName: keyof Variables,
        fieldValue: Variables[typeof fieldName]
      ) => query({ ...variables, [fieldName]: fieldValue } as Variables)
  }
  const genKey = <V extends Record<string, unknown> = Record<string, unknown>>(name: string, object: V = {} as V): SWRKeyInterface => [name, ...Object.keys(object).sort().map(key => object[key])];
  return {
    ...sdk,
    useFeed(variables?: FeedQueryVariables, config?: SWRConfigInterface<FeedQuery>) {
      return useSWR<FeedQuery>(genKey<FeedQueryVariables>('Feed', variables), () => sdk.feed(variables), config);
    },
    useFeed2(variables: Feed2QueryVariables, config?: SWRConfigInterface<Feed2Query>) {
      return useSWR<Feed2Query>(genKey<Feed2QueryVariables>('Feed2', variables), () => sdk.feed2(variables), config);
    },
    useFeed2Infinite(getKey: SWRInfiniteKeyLoader<Feed2Query, Feed2QueryVariables>, variables: Feed2QueryVariables, config?: SWRInfiniteConfigInterface<Feed2Query>) {
      return useSWRInfinite<Feed2Query>(
        utilsForInfinite.generateGetKey<Feed2Query, Feed2QueryVariables>(genKey<Feed2QueryVariables>('Feed2', variables), getKey),
        utilsForInfinite.generateFetcher<Feed2Query, Feed2QueryVariables>(sdk.feed2, variables),
        config);
    },
    useFeed3(variables?: Feed3QueryVariables, config?: SWRConfigInterface<Feed3Query>) {
      return useSWR<Feed3Query>(genKey<Feed3QueryVariables>('Feed3', variables), () => sdk.feed3(variables), config);
    },
    useFeed4(variables?: Feed4QueryVariables, config?: SWRConfigInterface<Feed4Query>) {
      return useSWR<Feed4Query>(genKey<Feed4QueryVariables>('Feed4', variables), () => sdk.feed4(variables), config);
    },
    useFeed4Infinite(getKey: SWRInfiniteKeyLoader<Feed4Query, Feed4QueryVariables>, variables?: Feed4QueryVariables, config?: SWRInfiniteConfigInterface<Feed4Query>) {
      return useSWRInfinite<Feed4Query>(
        utilsForInfinite.generateGetKey<Feed4Query, Feed4QueryVariables>(genKey<Feed4QueryVariables>('Feed4', variables), getKey),
        utilsForInfinite.generateFetcher<Feed4Query, Feed4QueryVariables>(sdk.feed4, variables),
        config);
    }
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;
