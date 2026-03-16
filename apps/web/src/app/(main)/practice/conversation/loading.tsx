export default function ConversationLoading() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <div className="hidden w-72 shrink-0 flex-col border-r border-slate-700/50 bg-slate-800/30 p-4 md:flex">
        <div className="mb-4 h-9 w-full animate-pulse rounded-lg bg-slate-700/40" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-slate-700/30" />
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-700/50 px-6 py-4">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-700/60" />
          <div className="ml-auto h-6 w-16 animate-pulse rounded-full bg-slate-700/40" />
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-hidden px-6 py-4">
          {/* Assistant message */}
          <div className="flex gap-3">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-700/60" />
            <div className="w-2/3 space-y-2">
              <div className="h-4 animate-pulse rounded bg-slate-700/50" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-700/40" />
              <div className="h-4 w-3/5 animate-pulse rounded bg-slate-700/30" />
            </div>
          </div>
          {/* User message */}
          <div className="flex justify-end">
            <div className="w-1/2 space-y-2">
              <div className="h-4 animate-pulse rounded bg-slate-700/40" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-700/30" />
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-700/50 px-6 py-4">
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-700/40" />
        </div>
      </div>
    </div>
  );
}
