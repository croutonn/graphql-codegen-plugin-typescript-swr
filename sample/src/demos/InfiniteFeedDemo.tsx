import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../client'
import { FeedType, getSdkWithHooks } from '../generated/sdk.infinite'
import type { FeedQuery } from '../generated/sdk.infinite'
import { setForceError } from '../mocks/data'

const PAGE_SIZE = 4

export function InfiniteFeedDemo() {
  const [forceError, setForceErrorState] = useState(false)
  const sdk = useMemo(() => getSdkWithHooks(createClient()), [])
  const { data, error, size, setSize, isLoading, mutate } = sdk.useFeedInfinite(
    'feed-infinite',
    (pageIndex) => ['offset', pageIndex * PAGE_SIZE],
    { type: FeedType.New, limit: PAGE_SIZE },
  )

  useEffect(() => {
    return () => setForceError('Feed', false)
  }, [])

  const toggleError = () => {
    const next = !forceError
    setForceErrorState(next)
    setForceError('Feed', next)
    mutate()
  }

  const pages = data ?? []
  const feedEntries = pages.flatMap((page: FeedQuery) => page.feed ?? [])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Pagination via useSWRInfinite</h2>
        <button
          type="button"
          onClick={toggleError}
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
        >
          {forceError ? 'Clear error' : 'Trigger error'}
        </button>
      </div>
      {isLoading && <p className="text-slate-500">loading...</p>}
      {error && <p className="text-red-600">failed to load: {error.message}</p>}
      <ul className="space-y-2">
        {feedEntries.map(
          (entry) =>
            entry && (
              <li key={entry.id} className="rounded border border-slate-200 p-3 text-sm">
                <span className="font-medium">{entry.repository.full_name}</span>
                <span className="ml-2 text-slate-500">score: {entry.score}</span>
              </li>
            ),
        )}
      </ul>
      <button
        type="button"
        onClick={() => setSize(size + 1)}
        className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
      >
        Load more
      </button>
    </section>
  )
}
