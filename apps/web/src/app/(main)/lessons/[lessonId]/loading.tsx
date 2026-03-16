export default function LessonLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-700/60" />
            <div className="h-4 w-16 animate-pulse rounded bg-slate-700/40" />
          </div>
          <div className="h-3 w-full animate-pulse rounded-full bg-slate-700/40" />
        </div>

        {/* Exercise indicators */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-2 flex-1 animate-pulse rounded-full bg-slate-700/40"
            />
          ))}
        </div>

        {/* Exercise card */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6 space-y-5">
          {/* Question */}
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-700/40" />
            <div className="h-7 w-3/4 animate-pulse rounded bg-slate-700/60" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-700/40" />
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded-xl bg-slate-700/30"
              />
            ))}
          </div>

          {/* Submit button */}
          <div className="h-11 w-full animate-pulse rounded-xl bg-slate-700/40" />
        </div>
      </div>
    </div>
  );
}
