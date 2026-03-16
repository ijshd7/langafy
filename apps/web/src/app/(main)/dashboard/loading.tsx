export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-700/60" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-700/40" />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
              <div className="mb-2 h-4 w-16 animate-pulse rounded bg-slate-700/60" />
              <div className="h-8 w-12 animate-pulse rounded bg-slate-700/40" />
            </div>
          ))}
        </div>

        {/* Continue learning CTA */}
        <div className="h-14 w-full animate-pulse rounded-xl bg-slate-700/40" />

        {/* Unit progress cards */}
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-slate-700/60" />
                <div className="h-5 w-40 animate-pulse rounded bg-slate-700/60" />
              </div>
              <div className="mb-2 h-2 w-full animate-pulse rounded-full bg-slate-700/40" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-10 animate-pulse rounded-lg bg-slate-700/30" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
