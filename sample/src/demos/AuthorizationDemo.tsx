import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../client'
import { getSdkWithHooks } from '../generated/sdk.default'
import { setForceError } from '../mocks/data'

const FAKE_JWT = 'dummy.jwt.token'

export function AuthorizationDemo() {
  const [authorized, setAuthorized] = useState(false)
  const [forceError, setForceErrorState] = useState(false)
  const sdk = useMemo(
    () =>
      getSdkWithHooks(
        createClient(authorized ? { Authorization: `Bearer ${FAKE_JWT}` } : undefined),
      ),
    [authorized],
  )
  const { data, error, isLoading, mutate } = sdk.useCurrentUserForProfile([
    'CurrentUserForProfile',
    authorized,
  ])

  useEffect(() => {
    return () => setForceError('CurrentUserForProfile', false)
  }, [])

  const toggleError = () => {
    const next = !forceError
    setForceErrorState(next)
    setForceError('CurrentUserForProfile', next)
    mutate()
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Toggle the Authorization header</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleError}
            className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
          >
            {forceError ? 'Clear error' : 'Trigger error'}
          </button>
          <button
            type="button"
            onClick={() => setAuthorized((prev) => !prev)}
            className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
          >
            {authorized ? 'Remove JWT' : 'Attach JWT'}
          </button>
        </div>
      </div>
      {isLoading && <p className="text-slate-500">loading...</p>}
      {error && <p className="text-red-600">failed to load: {error.message}</p>}
      {!isLoading && !error && (
        <p className="text-sm">
          {data?.currentUser ? (
            <>
              logged in as <span className="font-medium">{data.currentUser.login}</span>
            </>
          ) : (
            <span className="text-slate-500">not logged in (no Authorization header)</span>
          )}
        </p>
      )}
    </section>
  )
}
