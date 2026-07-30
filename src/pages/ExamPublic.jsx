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

  const handleDownload = useCallback(async (file) => {
    const { data, error } = await supabase.storage
      .from('exam-materials')
      .createSignedUrl(file.file_path, 3600)
    if (error || !data) { toast('Could not generate download link.', 'error'); return }
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
    if (error || data?.error) { setActionError(data?.error || error?.message || 'Failed to start exam'); return }
    setSubmissionId(data.submission_id)
    setDeadlineAt(data.deadline_at)
    setSubStatus('in_progress')
    setNow(Date.now())
    setStoredSession(token, { submissionId: data.submission_id, deadlineAt: data.deadline_at })
    toast('Exam started! Timer is running.', 'success')
  }

  const validateZip = (file) => {
    if (!file.name.toLowerCase().endsWith('.zip')) return 'Only .zip files are accepted.'
    if (file.size > 100 * 1024 * 1024) return 'File exceeds 100 MB limit.'
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
      const msg = data?.error || error?.message || 'Submission failed'
      if (msg.toLowerCase().includes("time's up") || msg.toLowerCase().includes('expired')) {
        setSubStatus('expired')
        setActionError("Time's up \u2014 this exam can no longer be submitted.")
        toast("Time's up! Exam could not be submitted.", 'error')
      } else { setActionError(msg); toast(msg, 'error') }
      return
    }
    setSubStatus('submitted')
    setSelectedFile(null)
    removeStoredSession(token)
    toast('Exam submitted successfully!', 'success')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'oklch(0.97 0.005 255)' }}>
        <div className="flex items-center gap-3 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'oklch(0.82 0.08 255)', borderTopColor: 'oklch(0.55 0.18 255)' }} />
          Loading...
        </div>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'oklch(0.97 0.005 255)' }}>
        <div className="animate-scale-in w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm" style={{ borderColor: 'oklch(0.92 0.005 255)' }}>
          <div className="mb-4 text-4xl" style={{ color: 'oklch(0.55 0.17 30)' }}>&#10060;</div>
          <h1 className="mb-2 text-xl font-bold" style={{ color: 'oklch(0.20 0.07 255)' }}>
            Invalid Link
          </h1>
          <p className="text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
            This exam link does not exist or may have been removed.
            Please check the URL and try again.
          </p>
        </div>
      </div>
    )
  }

  const isFinished = subStatus === 'submitted' || subStatus === 'expired'
  const countdownMs = deadlineAt ? new Date(deadlineAt).getTime() - now : 0
  const isUrgent = countdownMs > 0 && countdownMs <= 300_000

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'oklch(0.97 0.005 255)' }}>
      <header className="border-b bg-white/80 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4" style={{ borderColor: 'oklch(0.92 0.005 255)' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}>
            E
          </span>
          <span className="text-base font-bold sm:text-lg" style={{ color: 'oklch(0.20 0.07 255)' }}>
            Exam Taker
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="animate-fade-in rounded-2xl border bg-white p-5 shadow-sm sm:p-8" style={{ borderColor: 'oklch(0.92 0.005 255)' }}>
          <h2 className="mb-1 text-xl font-bold sm:text-2xl" style={{ color: 'oklch(0.15 0.02 255)' }}>
            {exam.title}
          </h2>
          {exam.description && (
            <p className="mb-6 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
              {exam.description}
            </p>
          )}

          {!submissionId ? (
            <>
              <div className="mb-5 rounded-xl p-4" style={{ backgroundColor: 'oklch(0.96 0.02 255)' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.35 0.02 255)' }}>
                  Enter your name below and click <strong>Start Exam</strong> to begin.
                  The timer will start immediately and cannot be paused.
                  {' '}<strong>Duration: {exam.duration_minutes} minutes.</strong>
                </p>
              </div>

              {actionError && (
                <p className="animate-fade-in mb-4 rounded-xl p-3 text-sm" style={{ backgroundColor: 'oklch(0.93 0.05 30)', color: 'oklch(0.40 0.12 30)' }}>
                  {actionError}
                </p>
              )}

              <form onSubmit={handleStart}>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    required
                    placeholder="Your full name"
                    className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
                    style={{ borderColor: 'oklch(0.90 0.01 255)', color: 'oklch(0.15 0.02 255)', '--tw-ring-color': 'oklch(0.73 0.12 255)' }}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={starting}
                    className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
                  >
                    {starting ? 'Starting...' : 'Start Exam'}
                  </button>
                </div>
              </form>
            </>
          ) : isFinished ? (
            <div className="py-6 text-center">
              {subStatus === 'submitted' ? (
                <div className="animate-scale-in">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white" style={{ backgroundColor: 'oklch(0.52 0.15 160)' }}>
                    &#10003;
                  </div>
                  <h3 className="mb-1 text-lg font-bold" style={{ color: 'oklch(0.35 0.10 145)' }}>
                    Exam Submitted
                  </h3>
                  <p className="text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
                    Your submission has been recorded. You may now close this page.
                  </p>
                </div>
              ) : (
                <div className="animate-scale-in">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white" style={{ backgroundColor: 'oklch(0.55 0.17 30)' }}>
                    &#9200;
                  </div>
                  <h3 className="mb-1 text-lg font-bold" style={{ color: 'oklch(0.40 0.12 30)' }}>
                    Time&rsquo;s Up
                  </h3>
                  <p className="text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
                    This exam can no longer be submitted.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between rounded-xl px-4 py-3 sm:px-5 sm:py-4" style={{ backgroundColor: isUrgent ? 'oklch(0.93 0.05 30)' : 'oklch(0.96 0.02 255)' }}>
                <div>
                  <span className="text-xs font-medium" style={{ color: isUrgent ? 'oklch(0.40 0.12 30)' : 'oklch(0.55 0.03 255)' }}>
                    {studentName}
                  </span>
                  <p className="text-xs" style={{ color: isUrgent ? 'oklch(0.45 0.10 30)' : 'oklch(0.65 0.02 255)' }}>
                    {exam.duration_minutes} min exam
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-base font-bold tabular-nums sm:text-lg ${
                      isUrgent ? 'animate-pulse-soft' : ''
                    }`}
                    style={{ color: isUrgent ? 'oklch(0.40 0.12 30)' : 'oklch(0.38 0.14 255)' }}
                  >
                    {countdownMs > 0 ? formatCountdown(countdownMs) : '0:00'}
                  </span>
                  <p className="text-xs" style={{ color: isUrgent ? 'oklch(0.45 0.10 30)' : 'oklch(0.65 0.02 255)' }}>
                    remaining
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold" style={{ color: 'oklch(0.30 0.02 255)' }}>
                  Materials
                </h3>
                {files && files.length > 0 ? (
                  <ul className="divide-y rounded-xl border" style={{ borderColor: 'oklch(0.92 0.005 255)' }}>
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center justify-between px-4 py-3 first:rounded-t-xl last:rounded-b-xl hover:bg-white/50">
                        <span className="truncate pr-2 text-sm" style={{ color: 'oklch(0.30 0.02 255)' }}>
                          {f.file_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownload(f)}
                          className="shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110"
                          style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm" style={{ color: 'oklch(0.65 0.02 255)' }}>
                    No materials uploaded.
                  </p>
                )}
              </div>

              <div className="rounded-xl border p-4 sm:p-5" style={{ borderColor: 'oklch(0.92 0.005 255)', backgroundColor: 'oklch(0.975 0.005 255)' }}>
                <h3 className="mb-3 text-sm font-semibold" style={{ color: 'oklch(0.30 0.02 255)' }}>
                  Submit your work
                </h3>

                <input
                  type="file"
                  accept=".zip"
                  required
                  onChange={handleFileSelect}
                  className="mb-3 block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white file:transition-all file:hover:brightness-110 file:bg-[oklch(0.55_0.18_255)]"
                />

                {fileError && (
                  <p className="animate-fade-in mb-2 text-xs" style={{ color: 'oklch(0.55 0.17 30)' }}>
                    {fileError}
                  </p>
                )}
                {actionError && (
                  <p className="animate-fade-in mb-2 text-xs" style={{ color: 'oklch(0.55 0.17 30)' }}>
                    {actionError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={submitting || !selectedFile || !!fileError}
                  onClick={handleSubmit}
                  className="w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 sm:w-auto"
                  style={{ backgroundColor: 'oklch(0.52 0.15 160)' }}
                >
                  {submitting ? 'Uploading...' : 'Submit Exam'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
