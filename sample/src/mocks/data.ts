export interface MockUser {
  login: string
  html_url: string
  avatar_url: string
}

export interface MockRepository {
  full_name: string
  html_url: string
  name: string
  description: string
  stargazers_count: number
  open_issues_count: number
  owner: MockUser
}

export interface MockComment {
  id: number
  postedBy: MockUser
  createdAt: number
  content: string
}

export interface MockEntry {
  id: number
  repository: MockRepository
  postedBy: MockUser
  createdAt: number
  score: number
  voteValue: number
  commentCount: number
  comments: MockComment[]
}

let nextCommentId = 1000
let nextEntryId = 100

export const users: Record<string, MockUser> = {
  leeb: {
    login: 'leeb',
    html_url: 'https://github.com/leeb',
    avatar_url: 'https://avatars.githubusercontent.com/u/8?v=4',
  },
  stubailo: {
    login: 'stubailo',
    html_url: 'https://github.com/stubailo',
    avatar_url: 'https://avatars.githubusercontent.com/u/9?v=4',
  },
}

let currentUserLogin: string | null = 'leeb'

export function setCurrentUserLogin(login: string | null) {
  currentUserLogin = login
}

export function getCurrentUser(): MockUser | null {
  return currentUserLogin ? users[currentUserLogin] : null
}

export const entries: MockEntry[] = Array.from({ length: 12 }).map((_, index) => {
  const owner = index % 2 === 0 ? users.leeb : users.stubailo
  return {
    id: nextEntryId++,
    repository: {
      full_name: `octocat/example-repo-${index + 1}`,
      html_url: `https://github.com/octocat/example-repo-${index + 1}`,
      name: `example-repo-${index + 1}`,
      description: `Example repository #${index + 1} used for smoke testing.`,
      stargazers_count: (index + 1) * 7,
      open_issues_count: index,
      owner,
    },
    postedBy: owner,
    createdAt: Date.now() - index * 1000 * 60 * 60,
    score: 10 - index,
    voteValue: 0,
    commentCount: 1,
    comments: [
      {
        id: nextCommentId++,
        postedBy: users.stubailo,
        createdAt: Date.now() - index * 1000 * 60 * 30,
        content: `Nice work on example-repo-${index + 1}!`,
      },
    ],
  }
})

export function findEntry(repoFullName: string): MockEntry | undefined {
  return entries.find((entry) => entry.repository.full_name === repoFullName)
}

export function addComment(repoFullName: string, content: string): MockComment {
  const entry = findEntry(repoFullName)
  if (!entry) {
    throw new Error(`Unknown repository: ${repoFullName}`)
  }
  const comment: MockComment = {
    id: nextCommentId++,
    postedBy: getCurrentUser() ?? users.leeb,
    createdAt: Date.now(),
    content,
  }
  entry.comments = [comment, ...entry.comments]
  entry.commentCount += 1
  return comment
}

export function applyVote(repoFullName: string, type: 'UP' | 'DOWN' | 'CANCEL'): MockEntry {
  const entry = findEntry(repoFullName)
  if (!entry) {
    throw new Error(`Unknown repository: ${repoFullName}`)
  }
  if (type === 'UP' && entry.voteValue !== 1) {
    entry.score += entry.voteValue === -1 ? 2 : 1
    entry.voteValue = 1
  } else if (type === 'DOWN' && entry.voteValue !== -1) {
    entry.score -= entry.voteValue === 1 ? 2 : 1
    entry.voteValue = -1
  } else if (type === 'CANCEL' && entry.voteValue !== 0) {
    entry.score -= entry.voteValue
    entry.voteValue = 0
  }
  return entry
}

export function addRepository(repoFullName: string): MockEntry {
  const owner = getCurrentUser() ?? users.leeb
  const entry: MockEntry = {
    id: nextEntryId++,
    repository: {
      full_name: repoFullName,
      html_url: `https://github.com/${repoFullName}`,
      name: repoFullName.split('/')[1] ?? repoFullName,
      description: 'Submitted during smoke testing.',
      stargazers_count: 0,
      open_issues_count: 0,
      owner,
    },
    postedBy: owner,
    createdAt: Date.now(),
    score: 1,
    voteValue: 1,
    commentCount: 0,
    comments: [],
  }
  entries.unshift(entry)
  return entry
}

const forcedErrorOperations = new Set<string>()

export function setForceError(operationName: string, enabled: boolean) {
  if (enabled) {
    forcedErrorOperations.add(operationName)
  } else {
    forcedErrorOperations.delete(operationName)
  }
}

export function shouldForceError(operationName: string): boolean {
  return forcedErrorOperations.has(operationName)
}
