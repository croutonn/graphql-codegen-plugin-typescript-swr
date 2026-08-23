import { graphql, HttpResponse } from 'msw'
import {
  addComment,
  addRepository,
  applyVote,
  entries,
  findEntry,
  getCurrentUser,
  shouldForceError,
} from './data'
import type {
  CommentQueryVariables,
  FeedQueryVariables,
  SubmitCommentMutationVariables,
  SubmitRepositoryMutationVariables,
  VoteMutationVariables,
} from '../generated/sdk.default'

function errorResponse(message: string) {
  return HttpResponse.json<{ errors: { message: string }[] }>({ errors: [{ message }] })
}

function toFeedEntry(entry: NonNullable<ReturnType<typeof findEntry>>) {
  return {
    id: entry.id,
    commentCount: entry.commentCount,
    createdAt: entry.createdAt,
    score: entry.score,
    vote: { vote_value: entry.voteValue },
    postedBy: { login: entry.postedBy.login, html_url: entry.postedBy.html_url },
    repository: {
      full_name: entry.repository.full_name,
      html_url: entry.repository.html_url,
      description: entry.repository.description,
      stargazers_count: entry.repository.stargazers_count,
      open_issues_count: entry.repository.open_issues_count,
      owner: { avatar_url: entry.repository.owner.avatar_url },
    },
  }
}

export const handlers = [
  graphql.query('Feed', ({ variables }: { variables: FeedQueryVariables }) => {
    if (shouldForceError('Feed')) return errorResponse('Failed to load feed (simulated)')
    const offset = variables.offset ?? 0
    const limit = variables.limit ?? entries.length
    return HttpResponse.json({
      data: {
        currentUser: getCurrentUser(),
        feed: entries.slice(offset, offset + limit).map(toFeedEntry),
      },
    })
  }),

  graphql.query('Comment', ({ variables }: { variables: CommentQueryVariables }) => {
    if (shouldForceError('Comment')) return errorResponse('Failed to load comments (simulated)')
    const entry = findEntry(variables.repoFullName)
    if (!entry) return errorResponse(`Unknown repository: ${variables.repoFullName}`)
    const offset = variables.offset ?? 0
    const limit = variables.limit ?? entry.comments.length
    return HttpResponse.json({
      data: {
        currentUser: getCurrentUser(),
        entry: {
          id: entry.id,
          createdAt: entry.createdAt,
          commentCount: entry.commentCount,
          postedBy: { login: entry.postedBy.login, html_url: entry.postedBy.html_url },
          repository: {
            full_name: entry.repository.full_name,
            html_url: entry.repository.html_url,
            description: entry.repository.description,
            stargazers_count: entry.repository.stargazers_count,
            open_issues_count: entry.repository.open_issues_count,
          },
          comments: entry.comments.slice(offset, offset + limit).map((comment) => ({
            id: comment.id,
            createdAt: comment.createdAt,
            content: comment.content,
            postedBy: { login: comment.postedBy.login, html_url: comment.postedBy.html_url },
          })),
        },
      },
    })
  }),

  graphql.query(
    'CurrentUserForProfile',
    ({ request }: { request: Request }) => {
      if (shouldForceError('CurrentUserForProfile')) {
        return errorResponse('Failed to load current user (simulated)')
      }
      const isAuthorized = Boolean(request.headers.get('Authorization'))
      return HttpResponse.json({ data: { currentUser: isAuthorized ? getCurrentUser() : null } })
    },
  ),

  graphql.mutation(
    'submitComment',
    ({ variables }: { variables: SubmitCommentMutationVariables }) => {
      if (shouldForceError('submitComment')) {
        return errorResponse('Failed to submit comment (simulated)')
      }
      const comment = addComment(variables.repoFullName, variables.commentContent)
      return HttpResponse.json({
        data: {
          submitComment: {
            id: comment.id,
            createdAt: comment.createdAt,
            content: comment.content,
            postedBy: { login: comment.postedBy.login, html_url: comment.postedBy.html_url },
          },
        },
      })
    },
  ),

  graphql.mutation('vote', ({ variables }: { variables: VoteMutationVariables }) => {
    if (shouldForceError('vote')) return errorResponse('Failed to vote (simulated)')
    const entry = applyVote(variables.repoFullName, variables.type)
    return HttpResponse.json({
      data: {
        vote: {
          id: entry.id,
          score: entry.score,
          vote: { vote_value: entry.voteValue },
        },
      },
    })
  }),

  graphql.mutation(
    'submitRepository',
    ({ variables }: { variables: SubmitRepositoryMutationVariables }) => {
      if (shouldForceError('submitRepository')) {
        return errorResponse('Failed to submit repository (simulated)')
      }
      const entry = addRepository(variables.repoFullName)
      return HttpResponse.json({ data: { submitRepository: { createdAt: entry.createdAt } } })
    },
  ),
]
