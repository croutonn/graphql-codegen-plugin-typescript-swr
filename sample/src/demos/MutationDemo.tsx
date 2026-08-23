import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../client'
import { VoteType, getSdkWithHooks } from '../generated/sdk.default'
import { setForceError } from '../mocks/data'

const REPO_FULL_NAME = 'octocat/example-repo-3'

export function MutationDemo() {
  const sdk = useMemo(() => getSdkWithHooks(createClient()), [])
  const { data, mutate } = sdk.useComment(['Comment', REPO_FULL_NAME], {
    repoFullName: REPO_FULL_NAME,
  })
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [forceError, setForceErrorState] = useState(false)

  useEffect(() => {
    return () => setForceError('submitComment', false)
  }, [])

  const toggleError = () => {
    const next = !forceError
    setForceErrorState(next)
    setForceError('submitComment', next)
  }

  const submitComment = async () => {
    if (!content.trim()) return
    setSubmitting(true)
    setMutationError(null)
    try {
      await sdk.submitComment({ repoFullName: REPO_FULL_NAME, commentContent: content })
      setContent('')
      await mutate()
    } catch (err) {
      setMutationError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const castVote = async (type: VoteType) => {
    const result = await sdk.vote({ repoFullName: REPO_FULL_NAME, type })
    setLastScore(result.vote?.score ?? null)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">mutation: submitComment / vote</h2>
        <button
          type="button"
          onClick={toggleError}
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
        >
          {forceError ? 'Clear submitComment error' : 'Trigger submitComment error'}
        </button>
      </div>
      {mutationError && <p className="text-red-600">failed to submit: {mutationError}</p>}
      {data?.entry && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{data.entry.repository.full_name}</p>
          {lastScore !== null && <p className="text-sm text-slate-600">score: {lastScore}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => castVote(VoteType.Up)}
              className="rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-500"
            >
              upvote
            </button>
            <button
              type="button"
              onClick={() => castVote(VoteType.Down)}
              className="rounded bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-500"
            >
              downvote
            </button>
            <button
              type="button"
              onClick={() => castVote(VoteType.Cancel)}
              className="rounded bg-slate-500 px-3 py-1 text-sm text-white hover:bg-slate-400"
            >
              Cancel vote
            </button>
          </div>
          <ul className="space-y-1 text-sm">
            {data.entry.comments.map(
              (comment) =>
                comment && (
                  <li key={comment.id}>
                    <span className="font-medium">{comment.postedBy.login}</span>: {comment.content}
                  </li>
                ),
            )}
          </ul>
          <div className="flex gap-2">
            <input
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Enter a comment"
              className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={submitComment}
              disabled={submitting}
              className="rounded bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
