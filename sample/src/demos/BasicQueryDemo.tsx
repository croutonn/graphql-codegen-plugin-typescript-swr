import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../client'
import { getSdkWithHooks } from '../generated/sdk.default'
import { setForceError } from '../mocks/data'

const REPO_FULL_NAME = 'octocat/example-repo-1'

export function BasicQueryDemo() {
  const [forceError, setForceErrorState] = useState(false)
  const sdk = useMemo(() => getSdkWithHooks(createClient()), [])
  const { data, error, isLoading, mutate } = sdk.useComment(['Comment', REPO_FULL_NAME], {
    repoFullName: REPO_FULL_NAME,
  })

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
        <h2 className="text-lg font-semibold text-slate-900">Basic useComment hook</h2>
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
      {data?.entry && (
        <div className="rounded border border-slate-200 p-4">
          <p className="font-medium">{data.entry.repository.full_name}</p>
          <p className="text-sm text-slate-600">{data.entry.repository.description}</p>
          <ul className="mt-2 space-y-1">
            {data.entry.comments.map(
              (comment) =>
                comment && (
                  <li key={comment.id} className="text-sm">
                    <span className="font-medium">{comment.postedBy.login}</span>: {comment.content}
                  </li>
                ),
            )}
          </ul>
        </div>
      )}
    </section>
  )
}
