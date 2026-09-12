import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../client'
import { getSdkWithHooks } from '../generated/sdk.rawRequest'
import { setForceError } from '../mocks/data'

const REPO_FULL_NAME = 'octocat/example-repo-1'

export function RawRequestDemo() {
  const [forceError, setForceErrorState] = useState(false)
  const sdk = useMemo(() => getSdkWithHooks(createClient()), [])
  const { data: response, error, isLoading, mutate } = sdk.useComment(['Comment:raw', REPO_FULL_NAME], {
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
        <h2 className="text-lg font-semibold text-slate-900">rawRequest: useComment hook</h2>
        <button
          type="button"
          onClick={toggleError}
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
        >
          {forceError ? 'Clear error' : 'Trigger error'}
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Because codegen.yml sets <code>rawRequest: true</code>, <code>useComment</code> resolves to{' '}
        <code>SWRRawResponse&lt;CommentQuery&gt;</code> instead of the plain query type. The query result now
        lives under <code>data.data</code>, alongside <code>status</code> and <code>headers</code> from the
        raw HTTP response.
      </p>
      {isLoading && <p className="text-slate-500">loading...</p>}
      {error && <p className="text-red-600">failed to load: {error.message}</p>}
      {response && (
        <div className="rounded border border-slate-200 p-4">
          <p className="text-sm text-slate-600">
            status: <span className="font-mono">{response.status}</span>
            {' · '}
            content-type: <span className="font-mono">{response.headers.get('content-type')}</span>
          </p>
          {response.data?.entry && (
            <div className="mt-3">
              <p className="font-medium">{response.data.entry.repository.full_name}</p>
              <p className="text-sm text-slate-600">{response.data.entry.repository.description}</p>
              <ul className="mt-2 space-y-1">
                {response.data.entry.comments.map(
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
        </div>
      )}
    </section>
  )
}
