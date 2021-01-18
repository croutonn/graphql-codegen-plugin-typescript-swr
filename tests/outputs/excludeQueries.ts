export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
  return {
    ...sdk,
    useFeed(key: SWRKeyInterface, variables?: FeedQueryVariables, config?: SWRConfigInterface<FeedQuery>) {
      return useSWR<FeedQuery>(key, () => sdk.feed(variables), config);
    },
    useFeed4(key: SWRKeyInterface, variables?: Feed4QueryVariables, config?: SWRConfigInterface<Feed4Query>) {
      return useSWR<Feed4Query>(key, () => sdk.feed4(variables), config);
    }
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;
