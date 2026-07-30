import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

const STORAGE_KEY = 'exam-taker:sub'

function getStoredSession(token) {
  try {
    return JSON.parse(sessionStorage.getItem(`${STORAGE_KEY}:${token}`))
  } catch { return null }
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
    if (error || !data) {
      toast('Could not generate download link.', 'error')
      return
    }
    window.open(data.signedUrl, '_blank')
  }, [toast])

  const handleStart = async (e) => {
    e.preventDefault()
    if (!studentName.trim()) return
    setStarting(true)
    setActionError(null)

    const { data, error } = await supabase.functions.invoke('start-exam', {
      body: { token, student_name: studentName.trim() },
    })

    setStarting(false)

    if (error || data?.error) {
      setActionError(data?.error || error?.message || 'Failed to start exam')
      return
    }

    setSubmissionId(data.submission_id)
    setDeadlineAt(data.deadline_at)
    setSubStatus('in_progress')
    setNow(Date.now())
    setStoredSession(token, { submissionId: data.submission_id, deadlineAt: data.deadline_at })
    toast('Exam started! Timer is running.', 'success')
  }

  const validateZip = (file) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return 'Only .zip files are accepted.'
    }
    if (file.size > 100 * 1024 * 1024) {
      return 'File exceeds 100 MB limit.'
    }
    return null
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0] || null
    setFileError(null)
    if (file) {
      const err = validateZip(file)
      if (err) {
        setFileError(err)
        setSelectedFile(null)
        e.target.value = ''
        return
      }
    }
    setSelectedFile(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) return
    setSubmitting(true)
    setActionError(null)

    const formData = new FormData()
    formData.append('submission_id', submissionId)
    formData.append('file', selectedFile)

    const { data, error } = await supabase.functions.invoke('submit-exam', {
      body: formData,
    })

    setSubmitting(false)

    if (error || data?.error) {
      const msg = data?.error || error?.message || 'Submission failed'
      if (msg.toLowerCase().includes("time's up") || msg.toLowerCase().includes('expired')) {
        setSubStatus('expired')
        setActionError("Time's up — this exam can no longer be submitted.")
        toast('Time\'s up! Exam could not be submitted.', 'error')
      } else {
        setActionError(msg)
        toast(msg, 'error')
      }
      return
    }

    setSubStatus('submitted')
    setSelectedFile(null)
    removeStoredSession(token)
    toast('Exam submitted successfully!', 'success')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-4xl text-red-500">&#10060;</div>
          <h1 className="mb-2 text-2xl font-bold text-red-600">Invalid Link</h1>
          <p className="text-gray-600">
            This exam link does not exist or may have been removed.
            Please check the URL and try again.
          </p>
        </div>
      </div>
    )
  }

  const isFinished = subStatus === 'submitted' || subStatus === 'expired'
  const countdownMs = deadlineAt ? new Date(deadlineAt).getTime() - now : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-3 shadow-sm sm:px-6 sm:py-4">
        <h1 className="text-lg font-bold text-blue-600 sm:text-xl">Exam Taker</h1>
      </header>

      <main className="mx-auto max-w-2xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-8">
          <h2 className="mb-2 text-xl font-bold sm:text-2xl">{exam.title}</h2>
          {exam.description && (
            <p className="mb-6 text-sm text-gray-600 sm:text-base">{exam.description}</p>
          )}

          {!submissionId ? (
            <>
              <p className="mb-4 text-sm text-gray-500">
                Enter your name below and click <strong>Start Exam</strong> to begin.
                The timer will start immediately and cannot be paused.
              </p>

              {actionError && (
                <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{actionError}</p>
              )}

              <form onSubmit={handleStart}>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    required
                    placeholder="Your full name"
                    className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={starting}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {starting ? 'Starting…' : 'Start Exam'}
                  </button>
                </div>
              </form>
            </>
          ) : isFinished ? (
            <div className="text-center">
              {subStatus === 'submitted' ? (
                <>
                  <div className="mb-3 text-4xl text-green-600">&#10003;</div>
                  <h3 className="mb-1 text-lg font-semibold text-green-700">
                    Exam Submitted
                  </h3>
                  <p className="text-sm text-gray-600">
                    Your submission has been recorded. You may now close this page.
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-3 text-4xl">&#9200;</div>
                  <h3 className="mb-1 text-lg font-semibold text-red-700">
                    Time&rsquo;s Up
                  </h3>
                  <p className="text-sm text-gray-600">
                    This exam can no longer be submitted.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 sm:px-4 sm:py-3">
                <span className="text-xs font-medium text-blue-800 sm:text-sm">
                  {studentName}
                </span>
                <span
                  className={`text-base font-bold tabular-nums sm:text-lg ${
                    countdownMs > 300_000 ? 'text-blue-800' : 'text-red-600 animate-pulse'
                  }`}
                >
                  {formatCountdown(countdownMs)}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Materials</h3>
                {files && files.length > 0 ? (
                  <ul className="divide-y rounded-lg border">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
                        <span className="truncate text-sm text-gray-700">{f.file_name}</span>
                        <button
                          type="button"
                          onClick={() => handleDownload(f)}
                          className="shrink-0 cursor-pointer rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">No materials uploaded.</p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="rounded-lg border bg-gray-50 p-3 sm:p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Submit your work
                </h3>

                <input
                  type="file"
                  accept=".zip"
                  required
                  onChange={handleFileSelect}
                  className="mb-3 block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />

                {fileError && (
                  <p className="mb-2 text-xs text-red-600">{fileError}</p>
                )}

                {actionError && (
                  <p className="mb-2 text-xs text-red-600">{actionError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedFile || !!fileError}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto"
                >
                  {submitting ? 'Uploading…' : 'Submit Exam'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
