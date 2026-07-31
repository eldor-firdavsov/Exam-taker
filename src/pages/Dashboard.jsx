import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useExams, useCreateExam, useDeleteExam } from '../hooks/useExams'

const STATUS_BADGES = {
  draft: { bg: 'oklch(0.93 0.01 255)', text: 'oklch(0.45 0.02 255)', label: 'Qoralama' },
  active: { bg: 'oklch(0.92 0.05 145)', text: 'oklch(0.35 0.10 145)', label: 'Faol' },
  archived: { bg: 'oklch(0.95 0.03 80)', text: 'oklch(0.45 0.08 80)', label: 'Arxivlangan' },
}

function StatusBadge({ status }) {
  const s = STATUS_BADGES[status] || STATUS_BADGES.draft
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label || status}
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
  const [expiresAt, setExpiresAt] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createExam.mutateAsync({
        title,
        description,
        duration_minutes: parseInt(duration, 10),
        expires_at: expiresAt || null,
      })
      setTitle('')
      setDescription('')
      setDuration('')
      setExpiresAt('')
      setShowForm(false)
      toast("Imtihon kodi bilan birga muvaffaqiyatli yaratildi.", 'success')
    } catch {
      toast("Imtihon yaratishda xatolik yuz berdi.", 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteExam.mutateAsync(id)
      toast("Imtihon o'chirildi.", 'success')
    } catch {
      toast("Imtihonni o'chirishda xatolik.", 'error')
    }
    setConfirmId(null)
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="animate-fade-in max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-3xl" style={{ color: 'oklch(0.55 0.17 30)' }}>&#9888;</div>
          <h2 className="mb-1 text-lg font-bold" style={{ color: 'oklch(0.20 0.07 255)' }}>
            Xatolik yuz berdi
          </h2>
          <p className="text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
            {error.message || "Imtihonlarni yuklashda xatolik. Qaytadan urinib ko'ring."}
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
            Mening imtihonlarim
          </h1>
          {exams && (
            <p className="mt-0.5 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
              Jami {exams.length} ta imtihon
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
          style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
        >
          {showForm ? 'Bekor qilish' : '+ Imtihon yaratish'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="animate-slide-up mb-8 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
          style={{ borderColor: 'oklch(0.92 0.005 255)' }}
        >
          <h2 className="mb-5 text-base font-semibold" style={{ color: 'oklch(0.20 0.07 255)' }}>
            Yangi imtihon yaratish
          </h2>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
              Imtihon nomi
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
              placeholder="Masalan: Yakuniy nazorat imtihoni"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
              Tavsif (ixtiyoriy)
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
              placeholder="Imtihon haqida qo'shimcha yo'riqnoma va ma'lumotlar..."
            />
          </div>

          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
                Davomiyligi (daqiqa)
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
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
                Amal qilish muddati (ixtiyoriy)
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'oklch(0.90 0.01 255)',
                  color: 'oklch(0.15 0.02 255)',
                  '--tw-ring-color': 'oklch(0.73 0.12 255)',
                }}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createExam.isPending}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
          >
            {createExam.isPending ? 'Yaratilmoqda...' : 'Imtihon yaratish'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'oklch(0.82 0.08 255)', borderTopColor: 'oklch(0.55 0.18 255)' }} />
            Imtihonlar yuklanmoqda...
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
                    {exam.description || "Tavsif berilmagan"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'oklch(0.65 0.02 255)' }}>
                    <span>{exam.duration_minutes} daqiqa</span>
                    <StatusBadge status={exam.status} />
                    <span>Yaratilgan sana: {new Date(exam.created_at).toLocaleDateString()}</span>
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
                        Tasdiqlash
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'oklch(0.93 0.01 255)', color: 'oklch(0.45 0.02 255)' }}
                      >
                        Bekor qilish
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(exam.id)}
                      className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ backgroundColor: 'oklch(0.93 0.05 30)', color: 'oklch(0.40 0.12 30)' }}
                    >
                      O'chirish
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
            Imtihonlar hali mavjud emas
          </h3>
          <p className="mb-5 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
            Boshlash uchun birinchi imtihoningizni yarating.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
            style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
          >
            Imtihon yaratish
          </button>
        </div>
      )}
    </div>
  )
}
