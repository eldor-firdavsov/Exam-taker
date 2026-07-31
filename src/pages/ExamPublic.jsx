import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

const STORAGE_KEY = 'exam-taker:sub'

function getStoredSession(token) {
  try { return JSON.parse(sessionStorage.getItem(`${STORAGE_KEY}:${token}`)) }
  catch { return null }
}
function setStoredSession(token, data) {
  sessionStorage.setItem(`${STORAGE_KEY}:${token}`, JSON.stringify(data))
}
function removeStoredSession(token) {
  sessionStorage.removeItem(`${STORAGE_KEY}:${token}`)
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

  useEffect(() => {
    if (!token || !exam) return
    const stored = getStoredSession(token)
    if (!stored) return
    ;(async () => {
      const { data, error } = await supabase.functions.invoke('get-submission', {
        body: { submission_id: stored.submissionId },
      })
      if (error || !data || data.error) {
        removeStoredSession(token)
        return
      }
      setSubmissionId(data.id)
      setDeadlineAt(data.deadline_at)
      setSubStatus(data.status)
      setStudentName(data.student_name)
    })()
  }, [token, exam])

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

  // Signed URLs map for inline media preview (images & videos)
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
    setStoredSession(token, { submissionId: data.submission_id, deadlineAt: data.deadline_at })
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
    removeStoredSession(token)
    toast("Imtihon muvaffaqiyatli topshirildi!", 'success')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-sm border border-slate-200 text-sm font-medium text-slate-600">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Yuklanmoqda...
        </div>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 font-sans">
        <div className="animate-scale-in w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
            &#9888;
          </div>
          <h1 className="mb-2 text-xl font-bold text-slate-900">
            Imtihon kodi noto'g'ri
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Ushbu imtihon kodi mavjud emas. Kodning to'g'riligini tekshirib, qaytadan kiriting.
          </p>
        </div>
      </div>
    )
  }

  const isFinished = subStatus === 'submitted' || subStatus === 'expired'
  const countdownMs = deadlineAt ? new Date(deadlineAt).getTime() - now : 0
  const isUrgent = countdownMs > 0 && countdownMs <= 300_000

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm">
              E
            </span>
            <div>
              <span className="text-base font-bold text-slate-900 block leading-none">
                Exam Taker
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Talaba seansi
              </span>
            </div>
          </div>

          {submissionId && !isFinished && (
            <div className={`flex items-center gap-2 rounded-2xl px-4 py-1.5 border transition-all ${
              isUrgent
                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse-soft'
                : 'bg-blue-50 border-blue-100 text-blue-900'
            }`}>
              <span className="text-xs font-semibold">Qolgan vaqt:</span>
              <span className="font-mono text-base font-extrabold tabular-nums">
                {countdownMs > 0 ? formatCountdown(countdownMs) : '0:00'}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="animate-fade-in space-y-6">
          {/* Exam Info Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {exam.title}
              </h1>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {exam.duration_minutes} daqiqa
              </span>
            </div>
            {exam.description && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {exam.description}
              </p>
            )}

            {!submissionId ? (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="mb-6 rounded-2xl bg-blue-50/70 p-4 border border-blue-100/60">
                  <p className="text-xs sm:text-sm text-blue-900 leading-relaxed font-medium">
                    Ism va familiyangizni kiriting va <strong>Imtihonni boshlash</strong> tugmasini bosing. Vaqt hisobi darhol boshlanadi.
                  </p>
                </div>

                {actionError && (
                  <div className="animate-fade-in mb-4 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-100">
                    {actionError}
                  </div>
                )}

                <form onSubmit={handleStart} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      To'liq ism va familiyangiz
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: Ali Valiyev"
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={starting}
                    className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                  >
                    {starting ? 'Boshlanmoqda...' : 'Imtihonni boshlash \u2192'}
                  </button>
                </form>
              </div>
            ) : isFinished ? (
              <div className="mt-8 border-t border-slate-100 pt-8 text-center">
                {subStatus === 'submitted' ? (
                  <div className="animate-scale-in py-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-2xl text-emerald-600 border border-emerald-100 shadow-sm">
                      &#10003;
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-slate-900">
                      Imtihon muvaffaqiyatli topshirildi
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Javoblaringiz va faylingiz o'qituvchiga yuborildi. Sahifani yopishingiz mumkin.
                    </p>
                  </div>
                ) : (
                  <div className="animate-scale-in py-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-2xl text-amber-600 border border-amber-100 shadow-sm">
                      &#9200;
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-slate-900">
                      Imtihon vaqti tugadi
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Ushbu imtihon seansi uchun ajratilgan vaqt nihoyasiga yetdi.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Active Exam Section: Materials & Submissions */}
          {submissionId && !isFinished && (
            <div className="space-y-6 animate-slide-up">
              {/* Materials Card */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
                  <span>Imtihon materiallari</span>
                  <span className="text-xs font-normal text-slate-500">
                    {files ? `${files.length} ta fayl` : ''}
                  </span>
                </h2>

                {files && files.length > 0 ? (
                  <div className="space-y-4">
                    {files.map((f) => {
                      const isImage = f.file_name.match(/\.(png|jpg|jpeg|gif|webp)$/i)
                      const isVideo = f.file_name.match(/\.(mp4|webm|mov|avi)$/i)
                      const isZip = f.file_name.match(/\.zip$/i)
                      const src = mediaUrls[f.id]
                      const badgeText = isImage ? 'Rasm' : isVideo ? 'Video' : isZip ? 'ZIP' : 'Hujjat'

                      return (
                        <div
                          key={f.id}
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-md"
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="rounded-lg bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-700 uppercase">
                                {badgeText}
                              </span>
                              <span className="truncate text-sm font-bold text-slate-800">
                                {f.file_name}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDownload(f)}
                              className="shrink-0 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-slate-800"
                            >
                              Yuklab olish
                            </button>
                          </div>

                          {/* Image preview */}
                          {isImage && src && (
                            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
                              <img
                                src={src}
                                alt={f.file_name}
                                className="max-h-80 w-full object-contain rounded-lg cursor-pointer transition-opacity hover:opacity-95"
                                onClick={() => handleDownload(f)}
                              />
                            </div>
                          )}

                          {/* Video Player */}
                          {isVideo && src && (
                            <div className="mt-3 overflow-hidden rounded-xl bg-black">
                              <video
                                controls
                                controlsList="nodownload"
                                src={src}
                                className="max-h-80 w-full rounded-xl"
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
                  <p className="text-xs text-slate-400 italic">
                    O'qituvchi tomonidan qo'shimcha materiallar biriktirilmagan.
                  </p>
                )}
              </div>

              {/* Submit Solution Card */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Javobingizni topshirish (.zip fayl)
                </h2>
                <p className="text-xs text-slate-500 mb-5">
                  Barcha javoblar yoki kodingizni bitta <strong>.zip</strong> arxivga solib yuklang.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type="file"
                      accept=".zip"
                      required
                      onChange={handleFileSelect}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:cursor-pointer file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-blue-700 file:transition-all hover:file:bg-blue-100"
                    />
                  </div>

                  {selectedFile && !fileError && (
                    <div className="animate-fade-in rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200/80 flex items-center justify-between">
                      <span>{selectedFile.name}</span>
                      <span className="font-normal text-emerald-600">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  )}

                  {fileError && (
                    <div className="animate-fade-in text-xs font-semibold text-red-600">
                      {fileError}
                    </div>
                  )}

                  {actionError && (
                    <div className="animate-fade-in text-xs font-semibold text-red-600">
                      {actionError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !selectedFile || !!fileError}
                    className="w-full sm:w-auto rounded-2xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                  >
                    {submitting ? 'Yuklanmoqda...' : 'Topshiriqni yuborish'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
