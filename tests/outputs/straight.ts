export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
  return {
    ...sdk,
    useFeed(key: SWRKeyInterface, variables?: FeedQueryVariables, config?: SWRConfigInterface<FeedQuery>) {
      return useSWR<FeedQuery>(key, () => sdk.feed(variables), config);
    },
    useFeed2(key: SWRKeyInterface, variables: Feed2QueryVariables, config?: SWRConfigInterface<Feed2Query>) {
      return useSWR<Feed2Query>(key, () => sdk.feed2(variables), config);
    },
    useFeed3(key: SWRKeyInterface, variables?: Feed3QueryVariables, config?: SWRConfigInterface<Feed3Query>) {
      return useSWR<Feed3Query>(key, () => sdk.feed3(variables), config);
    },
    useFeed4(key: SWRKeyInterface, variables?: Feed4QueryVariables, config?: SWRConfigInterface<Feed4Query>) {
      return useSWR<Feed4Query>(key, () => sdk.feed4(variables), config);
    }
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;
