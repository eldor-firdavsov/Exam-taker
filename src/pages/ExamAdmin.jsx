import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { useExam, useUpdateExam } from '../hooks/useExams'
import { useExamFiles, useUploadFile, useDeleteFile, validateExamFile } from '../hooks/useExamFiles'
import { useExamLinks, useCreateExamLink, useUpdateExamLink, useDeleteExamLink } from '../hooks/useExamLinks'
import { useSubmissions, useGradeSubmission } from '../hooks/useSubmissions'

const STATUS_BADGES = {
  in_progress: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-blue-100 text-blue-700',
  expired: 'bg-red-100 text-red-700',
}

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGES[status] || 'bg-gray-200 text-gray-700'}`}
    >
      {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function GradeCell({ submission, onGrade }) {
  const [value, setValue] = useState(submission.grade ?? '')
  const [saving, setSaving] = useState(false)

  const handleBlur = async () => {
    const g = value === '' ? null : parseInt(value, 10)
    if (g === submission.grade) return
    if (g !== null && (isNaN(g) || g < 0 || g > 100)) return

    setSaving(true)
    try {
      await onGrade({ id: submission.id, grade: g })
    } catch {
      /* ignore */
    }
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={100}
        className="w-16 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={(e) => setValue(e.target.value === '' ? '' : e.target.value)}
        onBlur={handleBlur}
        disabled={saving}
      />
      {saving && <span className="text-xs text-gray-400">saving…</span>}
      {submission.grade != null && !saving && (
        <span className="text-xs text-gray-400">/ 100</span>
      )}
    </div>
  )
}

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  if (Math.abs(diff) < 86400000) {
    return date.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString()
}

export default function ExamAdmin() {
  const { examId } = useParams()
  const toast = useToast()
  const { data: exam, isLoading, error: examError } = useExam(examId)
  const updateExam = useUpdateExam()
  const { data: files } = useExamFiles(examId)
  const uploadFile = useUploadFile()
  const deleteFile = useDeleteFile()
  const { data: links } = useExamLinks(examId)
  const createLink = useCreateExamLink()
  const updateLink = useUpdateExamLink()
  const deleteLink = useDeleteExamLink()
  const linkIds = links?.map((l) => l.id) || []
  const { data: submissions, isLoading: subsLoading } = useSubmissions(linkIds)
  const gradeSubmission = useGradeSubmission()

  const fileInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [status, setStatus] = useState('draft')
  const [dirty, setDirty] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('submitted_at')
  const [gradeFilter, setGradeFilter] = useState('all')

  // Link expiry
  const [showLinkExpiry, setShowLinkExpiry] = useState(null)
  const [expiryInput, setExpiryInput] = useState('')

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-500">Loading exam…</p>
        </div>
      </div>
    )
  }

  if (examError || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-xl font-bold text-red-600">Exam Not Found</h2>
          <p className="text-gray-600">
            {examError?.message || 'This exam does not exist or you do not have access.'}
          </p>
        </div>
      </div>
    )
  }

  if (!dirty && title === '' && exam) {
    setTitle(exam.title)
    setDescription(exam.description || '')
    setDuration(String(exam.duration_minutes))
    setStatus(exam.status)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await updateExam.mutateAsync({
        id: examId,
        title,
        description,
        duration_minutes: parseInt(duration, 10),
        status,
      })
      setDirty(false)
      toast('Exam saved.', 'success')
    } catch {
      toast('Failed to save exam.', 'error')
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationErr = validateExamFile(file)
    if (validationErr) {
      setUploadError(validationErr)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      await uploadFile.mutateAsync({ examId, file })
      toast('File uploaded.', 'success')
    } catch (err) {
      setUploadError(err.message || 'Upload failed.')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteFile = async (f) => {
    try {
      await deleteFile.mutateAsync({ id: f.id, filePath: f.file_path, examId })
      toast('File deleted.', 'success')
    } catch {
      toast('Failed to delete file.', 'error')
    }
  }

  const handleGenerateLink = async () => {
    try {
      await createLink.mutateAsync({ examId })
      toast('Shareable link created.', 'success')
    } catch {
      toast('Failed to create link.', 'error')
    }
  }

  const handleDeleteLink = async (link) => {
    try {
      await deleteLink.mutateAsync({ id: link.id, examId })
      toast('Link deleted.', 'success')
    } catch {
      toast('Failed to delete link.', 'error')
    }
  }

  const handleCopyLink = async (link) => {
    const url = `${window.location.origin}/exam/${link.token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(link.id)
      setTimeout(() => setCopiedId(null), 2000)
      toast('Link copied to clipboard.', 'success')
    } catch {
      toast('Could not copy link.', 'error')
    }
  }

  const handleSaveExpiry = async (link) => {
    try {
      await updateLink.mutateAsync({
        id: link.id,
        examId,
        expires_at: expiryInput || null,
      })
      setShowLinkExpiry(null)
      setExpiryInput('')
      toast('Link expiry updated.', 'success')
    } catch {
      toast('Failed to update expiry.', 'error')
    }
  }

  const handleDownloadZip = async (sub) => {
    if (!sub.file_path) return
    const { data, error } = await supabase.storage
      .from('submissions')
      .createSignedUrl(sub.file_path, 3600)
    if (error || !data) {
      toast('Could not generate download link.', 'error')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const handleGrade = async ({ id, grade }) => {
    try {
      await gradeSubmission.mutateAsync({ id, grade })
      toast(grade != null ? 'Grade saved.' : 'Grade removed.', 'success')
    } catch {
      toast('Failed to save grade.', 'error')
    }
  }

  const statusOptions = ['draft', 'active', 'archived']
  const linkExpired = (link) => link.expires_at && new Date(link.expires_at) < new Date()

  let filtered = submissions || []

  if (filterStatus !== 'all') {
    filtered = filtered.filter((s) => s.status === filterStatus)
  }

  if (gradeFilter === 'graded') {
    filtered = filtered.filter((s) => s.grade != null)
  } else if (gradeFilter === 'ungraded') {
    filtered = filtered.filter((s) => s.grade == null)
  }

  filtered.sort((a, b) => {
    if (sortBy === 'submitted_at') {
      const ta = a.submitted_at || a.created_at
      const tb = b.submitted_at || b.created_at
      return tb.localeCompare(ta)
    }
    if (sortBy === 'student_name') {
      return a.student_name.localeCompare(b.student_name)
    }
    return 0
  })

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-bold sm:text-2xl">{exam.title}</h1>

      <form onSubmit={handleSave} className="mb-8 rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Exam Details</h2>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            type="text"
            required
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setDirty(true) }}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setDirty(true) }}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Duration (minutes)</label>
          <input
            type="number"
            required
            min={1}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={duration}
            onChange={(e) => { setDuration(e.target.value); setDirty(true) }}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Status</label>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setDirty(true) }}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!dirty || updateExam.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {updateExam.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <div className="mb-8 rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Materials</h2>

        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          {uploading && <p className="mt-1 text-xs text-gray-500">Uploading…</p>}
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
          <p className="mt-1 text-xs text-gray-400">
            Allowed: PDF, Word, PowerPoint, images, ZIP, text. Max 50 MB.
          </p>
        </div>

        {files && files.length > 0 ? (
          <ul className="divide-y">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2">
                <span className="truncate text-sm text-gray-700">{f.file_name}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteFile(f)}
                  className="shrink-0 cursor-pointer rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No files uploaded yet.</p>
        )}
      </div>

      <div className="mb-8 rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Shareable Links</h2>
          <button
            type="button"
            onClick={handleGenerateLink}
            disabled={createLink.isPending}
            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:self-auto"
          >
            {createLink.isPending ? 'Generating…' : 'Generate Link'}
          </button>
        </div>

        {links && links.length > 0 ? (
          <ul className="divide-y">
            {links.map((link) => {
              const url = `${window.location.origin}/exam/${link.token}`
              const expired = linkExpired(link)
              return (
                <li key={link.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-700">{url}</p>
                    <p className="text-xs text-gray-400">
                      Created {formatDate(link.created_at)}
                      {link.expires_at && (
                        <> &middot; Expires {formatDate(link.expires_at)}</>
                      )}
                      {expired && (
                        <span className="ml-2 font-medium text-red-600">(expired)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {showLinkExpiry === link.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="datetime-local"
                          className="w-44 rounded border px-2 py-1 text-xs"
                          value={expiryInput}
                          onChange={(e) => setExpiryInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveExpiry(link)}
                          className="cursor-pointer rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowLinkExpiry(null); setExpiryInput('') }}
                          className="cursor-pointer rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setShowLinkExpiry(link.id); setExpiryInput(link.expires_at ? new Date(link.expires_at).toISOString().slice(0, 16) : '') }}
                        className="cursor-pointer rounded px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        {link.expires_at ? 'Edit Expiry' : 'Set Expiry'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyLink(link)}
                      className="cursor-pointer rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      {copiedId === link.id ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLink(link)}
                      className="cursor-pointer rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No links generated yet.</p>
        )}
      </div>

      <div className="rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Submissions</h2>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Status</label>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Grade</label>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="graded">Graded</option>
              <option value="ungraded">Ungraded</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Sort</label>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="submitted_at">Submitted Time</option>
              <option value="student_name">Student Name</option>
            </select>
          </div>
        </div>

        {subsLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            Loading submissions…
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-gray-500">
                  <th className="pb-2 pr-4">Student</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Submitted</th>
                  <th className="pb-2 pr-4">File</th>
                  <th className="pb-2 pr-4">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-800">
                      {sub.student_name}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-3 pr-4 text-gray-500">
                      {sub.submitted_at ? formatDate(sub.submitted_at) : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      {sub.file_path ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadZip(sub)}
                          className="cursor-pointer rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Download
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <GradeCell submission={sub} onGrade={handleGrade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-sm text-gray-400">
            {submissions && submissions.length > 0
              ? 'No submissions match the current filters.'
              : 'No submissions yet.'}
          </p>
        )}
      </div>
    </div>
  )
}
