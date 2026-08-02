import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useExams, useCreateExam, useDeleteExam } from '../hooks/useExams'
import { Plus, Radio, Clock, Trash2, Calendar, FileText } from 'lucide-react'

const STATUS_BADGES = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'Qoralama' },
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Faol' },
  archived: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Arxivlangan' },
}

function StatusBadge({ status }) {
  const s = STATUS_BADGES[status] || STATUS_BADGES.draft
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}
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
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
          <h2 className="mb-1 text-base font-bold text-slate-900">
            Xatolik yuz berdi
          </h2>
          <p className="text-xs text-slate-500">
            {error.message || "Imtihonlarni yuklashda xatolik. Qaytadan urinib ko'ring."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Imtihonlar ro'yxati
          </h1>
          {exams && (
            <p className="mt-0.5 text-xs text-slate-500">
              Barcha yaratilgan va faol imtihonlar (Jami: {exams.length} ta)
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/live"
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <Radio className="h-3.5 w-3.5 text-emerald-600" />
            <span>Jonli monitoring</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-[#228BE6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1C7ED6] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{showForm ? 'Bekor qilish' : 'Yangi imtihon'}</span>
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-slate-200 bg-white p-5 space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900">
            Yangi imtihon yaratish
          </h2>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Imtihon nomi
              </label>
              <input
                type="text"
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#228BE6] focus:outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Web Dasturlash - Yakuniy Imtihon"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Tavsif (ixtiyoriy)
              </label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#228BE6] focus:outline-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Imtihon haqida qisqacha yo'riqnoma..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Davomiyligi (daqiqa)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#228BE6] focus:outline-none"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Amal qilish muddati (ixtiyoriy)
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#228BE6] focus:outline-none"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={createExam.isPending}
              className="cursor-pointer rounded-md bg-[#228BE6] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1C7ED6] disabled:opacity-50"
            >
              {createExam.isPending ? 'Yaratilmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      )}

      {/* Exam Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Imtihonlar yuklanmoqda...
        </div>
      ) : exams && exams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link
                    to={`/dashboard/exams/${exam.id}`}
                    className="text-base font-bold text-slate-900 hover:text-[#228BE6] transition-colors leading-snug"
                  >
                    {exam.title}
                  </Link>
                  <StatusBadge status={exam.status} />
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                  {exam.description || "Tavsif berilmagan"}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {exam.duration_minutes}m
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {new Date(exam.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/dashboard/exams/${exam.id}`}
                    className="cursor-pointer rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200 transition-colors"
                  >
                    Boshqarish
                  </Link>

                  {confirmId === exam.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(exam.id)}
                        className="cursor-pointer rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Ha
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="cursor-pointer rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                      >
                        Yo'q
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(exam.id)}
                      className="cursor-pointer rounded border border-slate-200 p-1 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 p-12 text-center bg-white">
          <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <h3 className="text-sm font-bold text-slate-900">
            Imtihonlar hali mavjud emas
          </h3>
          <p className="mt-1 text-xs text-slate-500 mb-4">
            Boshlash uchun birinchi imtihoningizni yarating.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="cursor-pointer rounded-md bg-[#228BE6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1C7ED6]"
          >
            + Imtihon yaratish
          </button>
        </div>
      )}
    </div>
  )
}
