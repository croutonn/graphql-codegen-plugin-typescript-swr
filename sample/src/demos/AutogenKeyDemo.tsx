import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../client'
import { getSdkWithHooks } from '../generated/sdk.autogenKey'
import { setForceError } from '../mocks/data'

const REPO_FULL_NAME = 'octocat/example-repo-2'

export function AutogenKeyDemo() {
  const [forceError, setForceErrorState] = useState(false)
  const sdk = useMemo(() => getSdkWithHooks(createClient()), [])
  const { data, error, isLoading, mutate } = sdk.useComment({ repoFullName: REPO_FULL_NAME })

  useEffect(() => {
    return () => setForceError('Comment', false)
  }, [])

  const toggleError = () => {
    const next = !forceError
    setForceErrorState(next)
    setForceError('Comment', next)
    mutate()
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">autogenSWRKey: key-omission pattern</h2>
        <button
          type="button"
          onClick={toggleError}
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
        >
          {forceError ? 'Clear error' : 'Trigger error'}
        </button>
      </div>
      <p className="text-sm text-slate-500">
        This hook auto-generates its key, so the caller never passes an SWR key.
      </p>
      {isLoading && <p className="text-slate-500">loading...</p>}
      {error && <p className="text-red-600">failed to load: {error.message}</p>}
      {data?.entry && (
        <div className="rounded border border-slate-200 p-4">
          <p className="font-medium">{data.entry.repository.full_name}</p>
          <p className="text-sm text-slate-600">comments: {data.entry.commentCount}</p>
        </div>
      )}
    </section>
  )
}
