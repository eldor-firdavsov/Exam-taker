import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import SunLogo from '../components/SunLogo'
import { Clock, CheckCircle2, AlertTriangle, Download, Upload, FileText, ArrowRight } from 'lucide-react'

const STORAGE_KEY = 'exam-taker:sub'

function getStoredSession(token) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${token}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function setStoredSession(token, data) {
  localStorage.setItem(`${STORAGE_KEY}:${token}`, JSON.stringify(data))
}
function removeStoredSession(token) {
  localStorage.removeItem(`${STORAGE_KEY}:${token}`)
}

function formatCountdown(ms) {
  if (ms <= 0) return '0:00'
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function ExamPublic() {
  const { token } = useParams()
  const toast = useToast()

  const [studentName, setStudentName] = useState('')
  const [submissionId, setSubmissionId] = useState(null)
  const [deadlineAt, setDeadlineAt] = useState(null)
  const [subStatus, setSubStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [now, setNow] = useState(Date.now())

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ['public-exam', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_exam_by_token', { p_token: token })
      if (error) throw error
      if (!data || data.length === 0) throw new Error('invalid_link')
      return data[0]
    },
    retry: false,
  })

  const { data: files } = useQuery({
    queryKey: ['public-exam-files', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_exam_files_by_token', { p_token: token })
      if (error) throw error
      return data || []
    },
    enabled: !!exam,
    retry: false,
  })

  // Restore stored session immediately on mount / refresh from localStorage
  useEffect(() => {
    if (!token) return
    const stored = getStoredSession(token)
    if (!stored) return

    setSubmissionId(stored.submissionId)
    if (stored.deadlineAt) setDeadlineAt(stored.deadlineAt)

    const fetchLatestSubmission = async () => {
      const { data, error } = await supabase.functions.invoke('get-submission', {
        body: { submission_id: stored.submissionId },
      })
      if (error || !data || data.error) {
        removeStoredSession(token)
        setSubmissionId(null)
        return
      }
      setSubmissionId(data.id)
      setDeadlineAt(data.deadline_at)
      setSubStatus(data.status)
      setStudentName(data.student_name)

      // Update localStorage with fresh data
      setStoredSession(token, { submissionId: data.id, deadlineAt: data.deadline_at, status: data.status })
    }

    fetchLatestSubmission()
    const pollId = setInterval(fetchLatestSubmission, 8000)
    return () => clearInterval(pollId)
  }, [token])

  useEffect(() => {
    if (subStatus !== 'in_progress') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [subStatus])

  useEffect(() => {
    if (subStatus !== 'in_progress' || !deadlineAt) return
    if (Date.now() >= new Date(deadlineAt).getTime()) {
      setSubStatus('expired')
    }
  }, [subStatus, deadlineAt, now])

  const [mediaUrls, setMediaUrls] = useState({})

  useEffect(() => {
    if (!files || files.length === 0) return
    let isMounted = true
    const loadSignedUrls = async () => {
      const urls = {}
      for (const f of files) {
        const isImage = f.file_name.match(/\.(png|jpg|jpeg|gif|webp)$/i)
        const isVideo = f.file_name.match(/\.(mp4|webm|mov|avi)$/i)
        if (isImage || isVideo) {
          const { data } = await supabase.storage.from('exam-materials').createSignedUrl(f.file_path, 7200)
          if (data?.signedUrl) {
            urls[f.id] = data.signedUrl
          }
        }
      }
      if (isMounted) setMediaUrls(urls)
    }
    loadSignedUrls()
    return () => { isMounted = false }
  }, [files])

  const handleDownload = useCallback(async (file) => {
    const { data, error } = await supabase.storage
      .from('exam-materials')
      .createSignedUrl(file.file_path, 3600)
    if (error || !data) { toast("Faylni yuklab olish havolasini yaratishda xatolik.", 'error'); return }
    window.open(data.signedUrl, '_blank')
  }, [toast])

  const handleStart = async (e) => {
    e.preventDefault()
    if (!studentName.trim()) return
    setStarting(true); setActionError(null)
    const { data, error } = await supabase.functions.invoke('start-exam', {
      body: { token, student_name: studentName.trim() },
    })
    setStarting(false)
    if (error || data?.error) { setActionError(data?.error || error?.message || "Imtihonni boshlashda xatolik"); return }
    setSubmissionId(data.submission_id)
    setDeadlineAt(data.deadline_at)
    setSubStatus('in_progress')
    setNow(Date.now())
    // Persist to localStorage so hard-refresh keeps student in their active exam
    setStoredSession(token, { submissionId: data.submission_id, deadlineAt: data.deadline_at, status: 'in_progress' })
    toast("Imtihon boshlandi! Vaqt hisoblanmoqda.", 'success')
  }

  const validateZip = (file) => {
    if (!file.name.toLowerCase().endsWith('.zip')) return "Faqat .zip formatidagi fayllar qabul qilinadi."
    if (file.size > 100 * 1024 * 1024) return "Fayl hajmi 100 MB limitidan oshmasligi kerak."
    return null
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0] || null
    setFileError(null)
    if (file) {
      const err = validateZip(file)
      if (err) { setFileError(err); setSelectedFile(null); e.target.value = ''; return }
    }
    setSelectedFile(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) return
    setSubmitting(true); setActionError(null)
    const formData = new FormData()
    formData.append('submission_id', submissionId)
    formData.append('file', selectedFile)
    const { data, error } = await supabase.functions.invoke('submit-exam', { body: formData })
    setSubmitting(false)
    if (error || data?.error) {
      const msg = data?.error || error?.message || "Topshirishda xatolik yuz berdi"
      if (msg.toLowerCase().includes("time's up") || msg.toLowerCase().includes('expired')) {
        setSubStatus('expired')
        setActionError("Imtihon vaqti tugadi \u2014 endi topshiriqni yuklab bo'lmaydi.")
        toast("Vaqt tugadi! Imtihon topshirilmadi.", 'error')
      } else { setActionError(msg); toast(msg, 'error') }
      return
    }
    setSubStatus('submitted')
    setSelectedFile(null)
    setStoredSession(token, { submissionId, deadlineAt, status: 'submitted' })
    toast("Imtihon muvaffaqiyatli topshirildi!", 'success')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] font-sans">
        <div className="text-xs font-semibold text-slate-600">Yuklanmoqda...</div>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 font-sans">
        <div className="w-full max-w-sm rounded-lg border border-slate-300 bg-white p-6 text-center shadow-2xs">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
          <h1 className="mb-1 text-base font-bold text-slate-900">
            Imtihon kodi noto'g'ri
          </h1>
          <p className="text-xs text-slate-600">
            Ushbu imtihon kodi mavjud emas. Kodni tekshirib qaytadan kiriting.
          </p>
        </div>
      </div>
    )
  }

  const isFinished = subStatus === 'submitted' || subStatus === 'expired'
  const countdownMs = deadlineAt ? new Date(deadlineAt).getTime() - now : 0
  const isUrgent = countdownMs > 0 && countdownMs <= 300_000

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-white px-4 py-3 sm:px-8 shadow-2xs">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <SunLogo className="h-7 w-7 text-[#FABB00]" />
            <span className="text-lg font-bold tracking-tight text-slate-900">
              ILMLA <span className="text-[#FABB00]">Exam</span>
            </span>
          </Link>

          {submissionId && !isFinished && (
            <div className={`flex items-center gap-1.5 rounded border px-3 py-1 text-xs font-bold ${
              isUrgent
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-blue-50 border-blue-300 text-[#228BE6]'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              <span>Qolgan vaqt:</span>
              <span className="font-mono font-extrabold text-sm">
                {countdownMs > 0 ? formatCountdown(countdownMs) : '0:00'}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h1 className="text-xl font-extrabold text-slate-900">
              {exam.title}
            </h1>
            <span className="rounded bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-xs font-bold text-slate-800">
              {exam.duration_minutes} daqiqa
            </span>
          </div>
          {exam.description && (
            <p className="text-xs text-slate-600 font-medium">
              {exam.description}
            </p>
          )}

          {!submissionId ? (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <div className="mb-4 rounded bg-blue-50 p-3 border border-blue-200 text-xs text-[#228BE6] font-semibold">
                Ismingizni kiriting va <strong>Imtihonni boshlash</strong> tugmasini bosing. Vaqt darhol boshlanadi.
              </div>

              {actionError && (
                <div className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleStart} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    To'liq ism va familiyangiz
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Ali Valiyev"
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#228BE6] focus:outline-none"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={starting}
                  className="w-full cursor-pointer rounded bg-[#228BE6] py-2.5 text-xs font-bold text-white hover:bg-[#1C7ED6] disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>{starting ? 'Boshlanmoqda...' : 'Imtihonni boshlash'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          ) : isFinished ? (
            <div className="mt-6 border-t border-slate-200 pt-6 text-center">
              {subStatus === 'submitted' ? (
                <div className="py-2">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 mb-2" />
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Imtihon muvaffaqiyatli topshirildi
                  </h3>
                  <p className="text-xs font-medium text-slate-600">
                    Javoblaringiz va faylingiz o'qituvchiga yuborildi.
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  <Clock className="mx-auto h-10 w-10 text-amber-600 mb-2" />
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Imtihon vaqti tugadi
                  </h3>
                  <p className="text-xs font-medium text-slate-600">
                    Ushbu imtihon seansi uchun ajratilgan vaqt nihoyasiga yetdi.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Active Exam Section */}
        {submissionId && !isFinished && (
          <div className="space-y-6">
            {/* Materials Card */}
            <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-2xs">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-3 flex items-center justify-between">
                <span>Imtihon materiallari</span>
                <span className="text-slate-500 font-medium">
                  {files ? `${files.length} ta fayl` : ''}
                </span>
              </h2>

              {files && files.length > 0 ? (
                <div className="space-y-3">
                  {files.map((f) => {
                    const isImage = f.file_name.match(/\.(png|jpg|jpeg|gif|webp)$/i)
                    const isVideo = f.file_name.match(/\.(mp4|webm|mov|avi)$/i)
                    const src = mediaUrls[f.id]

                    return (
                      <div
                        key={f.id}
                        className="rounded border border-slate-300 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="truncate text-xs font-bold text-slate-900">
                            {f.file_name}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDownload(f)}
                            className="cursor-pointer shrink-0 rounded bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Download className="h-3 w-3" />
                            Yuklab olish
                          </button>
                        </div>

                        {isImage && src && (
                          <div className="mt-2 overflow-hidden rounded border border-slate-300 bg-white p-1">
                            <img
                              src={src}
                              alt={f.file_name}
                              className="max-h-80 w-full object-contain rounded cursor-pointer"
                              onClick={() => handleDownload(f)}
                            />
                          </div>
                        )}

                        {isVideo && src && (
                          <div className="mt-2 overflow-hidden rounded bg-black">
                            <video
                              controls
                              controlsList="nodownload"
                              src={src}
                              className="max-h-80 w-full rounded"
                            >
                              Brauzeringiz HTML5 videoni qo'llab-quvvatlamaydi.
                            </video>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  O'qituvchi tomonidan materiallar biriktirilmagan.
                </p>
              )}
            </div>

            {/* Submit Solution Card */}
            <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-2xs">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1">
                Javobingizni topshirish (.zip fayl)
              </h2>
              <p className="text-xs text-slate-600 font-medium mb-4">
                Barcha kodingizni va javoblaringizni bitta <strong>.zip</strong> arxivga solib yuklang.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="file"
                  accept=".zip"
                  required
                  onChange={handleFileSelect}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-800 hover:file:bg-slate-200"
                />

                {selectedFile && !fileError && (
                  <div className="rounded bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 border border-emerald-300 flex items-center justify-between">
                    <span>{selectedFile.name}</span>
                    <span className="font-normal text-emerald-700">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                )}

                {fileError && (
                  <div className="text-xs font-bold text-red-600">
                    {fileError}
                  </div>
                )}

                {actionError && (
                  <div className="text-xs font-bold text-red-600">
                    {actionError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedFile || !!fileError}
                  className="w-full sm:w-auto cursor-pointer rounded bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Yuklanmoqda...' : 'Topshiriqni yuborish'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
