export default function VocabularyLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-700/60" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-700/40" />
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-3">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-slate-700/40" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-700/40" />
          <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-700/40" />
        </div>

        {/* Vocabulary cards */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-24 animate-pulse rounded bg-slate-700/60" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-700/40" />
                <div className="h-3 w-48 animate-pulse rounded bg-slate-700/30" />
              </div>
              <div className="h-6 w-10 animate-pulse rounded-full bg-slate-700/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
