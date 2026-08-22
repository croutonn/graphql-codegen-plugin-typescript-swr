import { useState } from 'react'
import { BasicQueryDemo } from './demos/BasicQueryDemo'
import { AutogenKeyDemo } from './demos/AutogenKeyDemo'
import { InfiniteFeedDemo } from './demos/InfiniteFeedDemo'
import { ExcludeQueriesDemo } from './demos/ExcludeQueriesDemo'
import { MutationDemo } from './demos/MutationDemo'
import { AuthorizationDemo } from './demos/AuthorizationDemo'

const demos = [
  { id: 'basic', label: 'Basic Query', component: BasicQueryDemo },
  { id: 'autogen-key', label: 'autogenSWRKey', component: AutogenKeyDemo },
  { id: 'infinite-feed', label: 'useSWRInfinite', component: InfiniteFeedDemo },
  { id: 'exclude-queries', label: 'excludeQueries', component: ExcludeQueriesDemo },
  { id: 'mutation', label: 'mutation', component: MutationDemo },
  { id: 'authorization', label: 'Authorization', component: AuthorizationDemo },
] as const

function App() {
  const [activeId, setActiveId] = useState<(typeof demos)[number]['id']>(demos[0].id)
  const active = demos.find((demo) => demo.id === activeId) ?? demos[0]
  const ActiveComponent = active.component

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          graphql-codegen-plugin-typescript-swr Sample App
        </h1>
        <p className="mt-1 text-slate-600">A smoke-test app for verifying behavior after dependency updates.</p>
      </header>
      <nav className="mb-6 flex flex-wrap gap-2">
        {demos.map((demo) => (
          <button
            key={demo.id}
            type="button"
            onClick={() => setActiveId(demo.id)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              demo.id === activeId
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
            }`}
          >
            {demo.label}
          </button>
        ))}
      </nav>
      <main className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <ActiveComponent />
      </main>
    </div>
  )
}

export default App
