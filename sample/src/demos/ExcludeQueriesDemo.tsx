import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '../client'
import { getSdkWithHooks } from '../generated/sdk.excluded'
import type { CurrentUserForProfileQuery } from '../generated/sdk.excluded'
import { setForceError } from '../mocks/data'

export function ExcludeQueriesDemo() {
  const sdk = useMemo(() => getSdkWithHooks(createClient()), [])
  const [data, setData] = useState<CurrentUserForProfileQuery | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [forceError, setForceErrorState] = useState(false)

  const fetchCurrentUser = useCallback(() => {
    setLoading(true)
    setError(null)
    sdk
      .CurrentUserForProfile()
      .then((result) => setData(result))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sdk])

  useEffect(() => {
    fetchCurrentUser()
  }, [fetchCurrentUser])

  useEffect(() => {
    return () => setForceError('CurrentUserForProfile', false)
  }, [])

  const toggleError = () => {
    const next = !forceError
    setForceErrorState(next)
    setForceError('CurrentUserForProfile', next)
    fetchCurrentUser()
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">excludeQueries: a query with no generated hook</h2>
        <button
          type="button"
          onClick={toggleError}
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
        >
          {forceError ? 'Clear error' : 'Trigger error'}
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Because codegen.yml sets <code>excludeQueries: [&quot;CurrentUserForProfile&quot;]</code>, no{' '}
        <code>useCurrentUserForProfile</code> hook is generated for this query. It becomes a plain
        Promise-based API you call directly via <code>sdk.CurrentUserForProfile()</code>.
      </p>
      {loading && <p className="text-slate-500">loading...</p>}
      {error && <p className="text-red-600">failed to load: {error}</p>}
      {!loading && !error && (
        <p className="text-sm">
          {data?.currentUser ? (
            <>
              logged in as <span className="font-medium">{data.currentUser.login}</span>
            </>
          ) : (
            'not logged in'
          )}
        </p>
      )}
    </section>
  )
}
