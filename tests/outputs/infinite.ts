export type SWRInfiniteKeyLoader<Data = unknown, Variables = unknown> = (
  index: number,
  previousPageData: Data | null
) => [keyof Variables, Variables[keyof Variables] | null] | null;
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
  return {
    ...sdk,
    useFeed(key: SWRKeyInterface, variables?: FeedQueryVariables, config?: SWRConfigInterface<FeedQuery, ClientError>) {
      return useSWR<FeedQuery, ClientError>(key, () => sdk.feed(variables), config);
    },
    useFeed2(key: SWRKeyInterface, variables: Feed2QueryVariables, config?: SWRConfigInterface<Feed2Query, ClientError>) {
      return useSWR<Feed2Query, ClientError>(key, () => sdk.feed2(variables), config);
    },
    useFeed2Infinite(id: string, getKey: SWRInfiniteKeyLoader<Feed2Query, Feed2QueryVariables>, variables: Feed2QueryVariables, config?: SWRInfiniteConfiguration<Feed2Query, ClientError>) {
      return useSWRInfinite<Feed2Query, ClientError>(
        utilsForInfinite.generateGetKey<Feed2Query, Feed2QueryVariables>(id, getKey),
        utilsForInfinite.generateFetcher<Feed2Query, Feed2QueryVariables>(sdk.feed2, variables),
        config);
    },
    useFeed3(key: SWRKeyInterface, variables?: Feed3QueryVariables, config?: SWRConfigInterface<Feed3Query, ClientError>) {
      return useSWR<Feed3Query, ClientError>(key, () => sdk.feed3(variables), config);
    },
    useFeed4(key: SWRKeyInterface, variables?: Feed4QueryVariables, config?: SWRConfigInterface<Feed4Query, ClientError>) {
      return useSWR<Feed4Query, ClientError>(key, () => sdk.feed4(variables), config);
    },
    useFeed4Infinite(id: string, getKey: SWRInfiniteKeyLoader<Feed4Query, Feed4QueryVariables>, variables?: Feed4QueryVariables, config?: SWRInfiniteConfiguration<Feed4Query, ClientError>) {
      return useSWRInfinite<Feed4Query, ClientError>(
        utilsForInfinite.generateGetKey<Feed4Query, Feed4QueryVariables>(id, getKey),
        utilsForInfinite.generateFetcher<Feed4Query, Feed4QueryVariables>(sdk.feed4, variables),
        config);
    }
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;
