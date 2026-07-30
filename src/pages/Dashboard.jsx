import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useExams, useCreateExam, useDeleteExam } from '../hooks/useExams'

const STATUS_BADGES = {
  draft: { bg: 'oklch(0.93 0.01 255)', text: 'oklch(0.45 0.02 255)' },
  active: { bg: 'oklch(0.92 0.05 145)', text: 'oklch(0.35 0.10 145)' },
  archived: { bg: 'oklch(0.95 0.03 80)', text: 'oklch(0.45 0.08 80)' },
}

function StatusBadge({ status }) {
  const s = STATUS_BADGES[status] || STATUS_BADGES.draft
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {status}
    </span>
  )
}

export default function Dashboard() {
  const { data: exams, isLoading, error } = useExams()
  const createExam = useCreateExam()
  const deleteExam = useDeleteExam()
  const toast = useToast()

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createExam.mutateAsync({
        title,
        description,
        duration_minutes: parseInt(duration, 10),
      })
      setTitle('')
      setDescription('')
      setDuration('')
      setShowForm(false)
      toast('Your exam is ready.', 'success')
    } catch {
      toast('Could not create exam.', 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteExam.mutateAsync(id)
      toast('Exam deleted.', 'success')
    } catch {
      toast('Could not delete exam.', 'error')
    }
    setConfirmId(null)
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="animate-fade-in max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-3xl" style={{ color: 'oklch(0.55 0.17 30)' }}>&#9888;</div>
          <h2 className="mb-1 text-lg font-bold" style={{ color: 'oklch(0.20 0.07 255)' }}>
            Something went wrong
          </h2>
          <p className="text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
            {error.message || 'Failed to load exams. Please try again.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: 'oklch(0.15 0.02 255)' }}>
            My Exams
          </h1>
          {exams && (
            <p className="mt-0.5 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
              {exams.length} {exams.length === 1 ? 'exam' : 'exams'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
          style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
        >
          {showForm ? 'Cancel' : 'Create Exam'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="animate-slide-up mb-8 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
          style={{ borderColor: 'oklch(0.92 0.005 255)' }}
        >
          <h2 className="mb-5 text-base font-semibold" style={{ color: 'oklch(0.20 0.07 255)' }}>
            New Exam
          </h2>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
              Title
            </label>
            <input
              type="text"
              required
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
              style={{
                borderColor: 'oklch(0.90 0.01 255)',
                color: 'oklch(0.15 0.02 255)',
                '--tw-ring-color': 'oklch(0.73 0.12 255)',
              }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Exam"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
              Description
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
              style={{
                borderColor: 'oklch(0.90 0.01 255)',
                color: 'oklch(0.15 0.02 255)',
                '--tw-ring-color': 'oklch(0.73 0.12 255)',
              }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
              Duration (minutes)
            </label>
            <input
              type="number"
              required
              min={1}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
              style={{
                borderColor: 'oklch(0.90 0.01 255)',
                color: 'oklch(0.15 0.02 255)',
                '--tw-ring-color': 'oklch(0.73 0.12 255)',
              }}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
            />
          </div>

          <button
            type="submit"
            disabled={createExam.isPending}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
          >
            {createExam.isPending ? 'Creating...' : 'Create Exam'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'oklch(0.82 0.08 255)', borderTopColor: 'oklch(0.55 0.18 255)' }} />
            Loading exams...
          </div>
        </div>
      ) : exams && exams.length > 0 ? (
        <div className="space-y-3">
          {exams.map((exam, i) => (
            <div
              key={exam.id}
              className="animate-slide-up rounded-2xl border bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
              style={{ borderColor: 'oklch(0.92 0.005 255)', animationDelay: `${i * 50}ms` }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <Link
                    to={`/dashboard/exams/${exam.id}`}
                    className="text-base font-semibold transition-colors hover:opacity-80 sm:text-lg"
                    style={{ color: 'oklch(0.55 0.18 255)' }}
                  >
                    {exam.title}
                  </Link>
                  <p className="mt-0.5 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
                    {exam.description || 'No description'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'oklch(0.65 0.02 255)' }}>
                    <span>{exam.duration_minutes} min</span>
                    <StatusBadge status={exam.status} />
                    <span>{new Date(exam.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="sm:ml-4">
                  {confirmId === exam.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(exam.id)}
                        className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110"
                        style={{ backgroundColor: 'oklch(0.55 0.17 30)' }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'oklch(0.93 0.01 255)', color: 'oklch(0.45 0.02 255)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(exam.id)}
                      className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ backgroundColor: 'oklch(0.93 0.05 30)', color: 'oklch(0.40 0.12 30)' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="animate-fade-in rounded-2xl border-2 border-dashed p-16 text-center" style={{ borderColor: 'oklch(0.90 0.01 255)' }}>
          <div className="mb-3 text-4xl" style={{ color: 'oklch(0.72 0.02 255)' }}>&#128203;</div>
          <h3 className="mb-1 text-base font-semibold" style={{ color: 'oklch(0.30 0.02 255)' }}>
            No exams yet
          </h3>
          <p className="mb-5 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
            Create your first exam to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
            style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
          >
            Create Exam
          </button>
        </div>
      )}
    </div>
  )
}
