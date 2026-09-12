import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../client'
import { FeedType, getSdkWithHooks } from '../generated/sdk.infiniteAutogenKey'
import type { FeedQuery } from '../generated/sdk.infiniteAutogenKey'
import { setForceError } from '../mocks/data'

const PAGE_SIZE = 4

export function InfiniteAutogenKeyDemo() {
  const [forceError, setForceErrorState] = useState(false)
  const sdk = useMemo(() => getSdkWithHooks(createClient()), [])
  // No `id` argument here: with `autogenSWRKey`, `utilsForInfinite.generateFetcher`'s
  // first tuple element is the auto-generated `SWRKeyInterface` key, not a string.
  // The first page also omits `offset` by returning `null` for it, exercising the
  // key loader's `Variables[keyof Variables] | null` field-value type.
  const { data, error, size, setSize, isLoading, mutate } = sdk.useFeedInfinite(
    (pageIndex) => (pageIndex === 0 ? ['offset', null] : ['offset', pageIndex * PAGE_SIZE]),
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
        <h2 className="text-lg font-semibold text-slate-900">autogenSWRKey + useSWRInfinite</h2>
        <button
          type="button"
          onClick={toggleError}
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
        >
          {forceError ? 'Clear error' : 'Trigger error'}
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Combines <code>autogenSWRKey</code> with <code>useSWRInfinite</code>: the key is
        auto-generated (no <code>id</code> argument) and the first page passes{' '}
        <code>offset: null</code> instead of a number.
      </p>
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
