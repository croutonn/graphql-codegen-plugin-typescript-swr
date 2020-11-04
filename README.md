# graphql-codegen-plugin-typescript-swr

A [GraphQL code generator](https://graphql-code-generator.com/) plug-in that automatically generates utility functions for [SWR](https://swr.vercel.app/).

# Example

```yaml
# codegen.yml
# Add `plugin-typescript-swr` below `typescript-graphql-request`
generates:
  path/to/graphql.ts:
    schema: 'schemas/github.graphql'
    documents: 'src/services/github/**/*.graphql'
    plugins:
      - typescript
      - typescript-operations
      - typescript-graphql-request
      - plugin-typescript-swr
config:
  rawRequest: false
  # exclude queries that are matched by micromatch (case-sensitive)
  excludeQueries:
    - foo*
    - bar
  # add `useSWRInfinite` wrapper for the queries that are matched by micromatch (case-sensitive)
  useSWRInfinite:
    - hoge
    - bar{1,3}
```

```typescript
// sdk.ts
import { GraphQLClient } from 'graphql-request'
import { getSdkWithHooks } from './graphql'
import { getJwt } from './jwt'

const sdk = () => {
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

export default sdk
```

```tsx
// pages/posts/[slug].tsx
import { GetStaticProps, GetStaticPropsResult } from 'next'
import ErrorPage from 'next/error'
import { useRouter } from 'next/router'
import Article from '../components/Article'
import sdk from '../sdk'

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

export const ArticlePage = ({ slug, initialData, preview }: ArticlePageProps): JSX.Element => {
  const router = useRouter()
  const { data: { article }, mutate: mutateArticle } = sdk().useGetArticle(
    `UniqueKeyForTheRequest/${slug}`, { slug }, { initialData }
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
