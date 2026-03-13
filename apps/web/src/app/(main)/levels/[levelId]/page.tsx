type LevelPageProps = {
  params: Promise<{ levelId: string }>
}

export default async function LevelPage(props: LevelPageProps) {
  const params = await props.params
  const { levelId } = params

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Level {levelId}</h1>
        <p className="text-slate-600 mb-8">Browse units and lessons</p>

        {/* Level content will be implemented in Step 3.7 */}
        <div className="rounded-lg bg-white border border-slate-200 p-8">
          <p className="text-slate-600">
            Units and lessons for level {levelId} coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
