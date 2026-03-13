type LessonPageProps = {
  params: Promise<{ lessonId: string }>
}

export default async function LessonPage(props: LessonPageProps) {
  const params = await props.params
  const { lessonId } = params

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Lesson {lessonId}</h1>
        <p className="text-slate-600 mb-8">Complete exercises to learn</p>

        {/* Lesson content and exercises will be implemented in Step 3.7 and 5.4 */}
        <div className="rounded-lg bg-white border border-slate-200 p-8">
          <p className="text-slate-600">
            Lesson content and exercise components coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
