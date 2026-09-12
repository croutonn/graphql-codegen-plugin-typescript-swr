type SWRRawResponse<Data = any> = { data?: Data | undefined; extensions?: any; headers: Headers; status: number; errors?: GraphQLError[] | undefined; };
export function getSdkWithHooks(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  const sdk = getSdk(client, withWrapper);
  return {
    ...sdk,
    useFeed(key: SWRKeyInterface, variables?: FeedQueryVariables, config?: SWRConfigInterface<SWRRawResponse<FeedQuery>, ClientError>) {
      return useSWR<SWRRawResponse<FeedQuery>, ClientError>(key, () => sdk.feed(variables), config);
    },
    useFeed2(key: SWRKeyInterface, variables: Feed2QueryVariables, config?: SWRConfigInterface<SWRRawResponse<Feed2Query>, ClientError>) {
      return useSWR<SWRRawResponse<Feed2Query>, ClientError>(key, () => sdk.feed2(variables), config);
    },
    useFeed3(key: SWRKeyInterface, variables?: Feed3QueryVariables, config?: SWRConfigInterface<SWRRawResponse<Feed3Query>, ClientError>) {
      return useSWR<SWRRawResponse<Feed3Query>, ClientError>(key, () => sdk.feed3(variables), config);
    },
    useFeed4(key: SWRKeyInterface, variables?: Feed4QueryVariables, config?: SWRConfigInterface<SWRRawResponse<Feed4Query>, ClientError>) {
      return useSWR<SWRRawResponse<Feed4Query>, ClientError>(key, () => sdk.feed4(variables), config);
    }
  };
}
export type SdkWithHooks = ReturnType<typeof getSdkWithHooks>;
