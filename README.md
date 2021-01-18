# graphql-codegen-plugin-typescript-swr <!-- omit in toc -->

A [GraphQL code generator](https://graphql-code-generator.com/) plug-in that automatically generates utility functions for [SWR](https://swr.vercel.app/).

## Table of Contents <!-- omit in toc -->

- [API Reference](#api-reference)
  - [`excludeQueries`](#excludequeries)
  - [`useSWRInfinite`](#useswrinfinite)
  - [`autogenSWRKey`](#autogenswrkey)
- [Config Example](#config-example)
- [Usage Examples](#usage-examples)
  - [Pagination](#pagination)
  - [Authorization](#authorization)
  - [Next.js](#nextjs)

## API Reference

### `excludeQueries`

type: `string | string[]` default: `""`

Exclude queries that are matched by micromatch (case-sensitive).

### `useSWRInfinite`

type: `string | string[]` default: `""`

Add `useSWRInfinite()` wrapper for the queries that are matched by micromatch (case-sensitive).

### `autogenSWRKey`

type: `boolean` default: `false`

Generate key to use `useSWR()` automatically.  
But, ​the cache may not work unless you separate the variables object into an external file and use it, or use a primitive type for the value of each field.

## Config Example

```yaml
generates:
  path/to/graphql.ts:
    schema: 'schemas/github.graphql'
    documents: 'src/services/github/**/*.graphql'
    plugins:
      - typescript
      - typescript-operations
      # Put `plugin-typescript-swr` below `typescript-graphql-request`
      - typescript-graphql-request
      - plugin-typescript-swr
config:
  rawRequest: false
  excludeQueries:
    - foo*
    - bar
  useSWRInfinite:
    - hoge
    - bar{1,3}
  autogenSWRKey: true
```

## Usage Examples

For the given input:

```graphql
query continents {
  continents {
    name
    countries {
      ...CountryFields
    }
  }
}

fragment CountryFields on Country {
  name
  currency
}
```

It generates SDK you can import and wrap your GraphQLClient instance, and get fully-typed SDK based on your operations:

```tsx
import { GraphQLClient } from 'graphql-request'
import { getSdkWithHooks } from './sdk'

function Continents() {
  const client = new GraphQLClient('https://countries.trevorblades.com/')
  const sdk = getSdkWithHooks(client)

  const { data, error } = sdk.useContinents('Continents')

  if (error) return <div>failed to load</div>
  if (!data) return <div>loading...</div>

  return (
    <ul>
      {data.continents.map((continent) => (
        <li>{continent.name}</li>
      ))}
    </ul>
  )
}
```

### Pagination

#### codegen.yaml <!-- omit in toc -->

```yaml
config:
  useSWRInfinite:
    - MyQuery
```

#### Functional Component <!-- omit in toc -->

```tsx
const { data, size, setSize } = sdk.useMyQueryInfinite(
  'id_for_caching',
  (pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.search.pageInfo.hasNextPage)
      return null
    return [
      'after',
      previousPageData ? previousPageData.search.pageInfo.endCursor : null,
    ]
  },
  variables, // GraphQL Query Variables
  config // Configuration of useSWRInfinite
)
```

### Authorization

```typescript
import { GraphQLClient } from 'graphql-request'
import { getSdkWithHooks } from './sdk'
import { getJwt } from './jwt'

const getAuthorizedSdk = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const jwt = getJwt()
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`
  }
  return getSdkWithHooks(
    new GraphQLClient(`${process.env.NEXT_PUBLIC_API_URL}`, {
      headers,
    })
  )
}

export default getAuthorizedSdk
```

### Next.js

```tsx
// pages/posts/[slug].tsx
import { GetStaticProps, NextPage } from 'next'
import ErrorPage from 'next/error'
import { useRouter } from 'next/router'
import Article from '../components/Article'
import sdk from '../sdk'
import { GetArticleQuery } from '../graphql'

type StaticParams = { slug: string }
type StaticProps = StaticParams & {
  initialData: {
    articleBySlug: NonNullable<GetArticleQuery['articleBySlug']>
  }
}
type ArticlePageProps = StaticProps & { preview?: boolean }

export const getStaticProps: GetStaticProps<StaticProps, StaticParams> = async ({
  params,
  preview = false,
  previewData
}) => {
  if (!params) {
    throw new Error('Parameter is invalid!')
  }

  const { articleBySlug: article } = await sdk().GetArticle({
    slug: params.slug,
  })

  if (!article) {
    throw new Error('Article is not found!')
  }

  const props: ArticlePageProps = {
    slug: params.slug,
    preview,
    initialData: {
      articleBySlug: article
    }
  }

  return {
    props: preview
      ? {
          ...props,
          ...previewData,
        }
      : props,
  }
})

export const ArticlePage: NextPage<ArticlePageProps> = ({ slug, initialData, preview }) => {
  const router = useRouter()
  const { data: { article }, mutate: mutateArticle } = sdk().useGetArticle(
    `GetArticle/${slug}`, { slug }, { initialData }
  )

  if (!router.isFallback && !article) {
    return <ErrorPage statusCode={404} />
  }

  // because of typescript problem
  if (!article) {
    throw new Error('Article is not found!')
  }

  return (
    <Layout preview={preview}>
      <>
        <Head>
          <title>{article.title}</title>
        </Head>
        <Article article={article} />
      </>
    </Layout>
  )
}
```
