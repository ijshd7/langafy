export default function LevelLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back button + header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-700/60" />
          <div className="h-7 w-36 animate-pulse rounded bg-slate-700/60" />
        </div>

        {/* Units */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3">
            {/* Unit header */}
            <div className="flex items-center gap-3 px-1">
              <div className="h-6 w-6 animate-pulse rounded-full bg-slate-700/60" />
              <div className="h-5 w-48 animate-pulse rounded bg-slate-700/60" />
            </div>

            {/* Lesson cards */}
            {Array.from({ length: 3 }).map((_, j) => (
              <div
                key={j}
                className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-5 w-40 animate-pulse rounded bg-slate-700/60" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-slate-700/40" />
                </div>
                <div className="mb-3 h-3 w-full animate-pulse rounded bg-slate-700/30" />
                <div className="h-1.5 w-full animate-pulse rounded-full bg-slate-700/40" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
