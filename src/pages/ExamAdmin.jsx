import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { useExam, useUpdateExam } from '../hooks/useExams'
import { useExamFiles, useUploadFile, useDeleteFile, validateExamFile } from '../hooks/useExamFiles'
import { useExamLinks, useCreateExamLink, useUpdateExamLink, useDeleteExamLink } from '../hooks/useExamLinks'
import { useSubmissions, useGradeSubmission } from '../hooks/useSubmissions'

const STATUS_BADGES = {
  in_progress: { bg: 'oklch(0.94 0.03 80)', text: 'oklch(0.40 0.10 80)', label: 'Bajarilmoqda' },
  submitted: { bg: 'oklch(0.92 0.05 145)', text: 'oklch(0.35 0.10 145)', label: 'Topshirildi' },
  expired: { bg: 'oklch(0.93 0.05 30)', text: 'oklch(0.40 0.12 30)', label: "Vaqti tugadi" },
}

function StatusBadge({ status }) {
  const s = STATUS_BADGES[status] || { bg: 'oklch(0.93 0.01 255)', text: 'oklch(0.45 0.02 255)', label: status }
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: s.bg, color: s.text }}>
      {s.label}
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
    try { await onGrade({ id: submission.id, grade: g }) } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={100}
        className="w-16 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2"
        style={{ borderColor: 'oklch(0.90 0.01 255)', color: 'oklch(0.15 0.02 255)', '--tw-ring-color': 'oklch(0.73 0.12 255)' }}
        value={value}
        onChange={(e) => setValue(e.target.value === '' ? '' : e.target.value)}
        onBlur={handleBlur}
        disabled={saving}
      />
      {saving && <span className="text-xs" style={{ color: 'oklch(0.65 0.02 255)' }}>saqlanmoqda...</span>}
      {submission.grade != null && !saving && (
        <span className="text-xs" style={{ color: 'oklch(0.65 0.02 255)' }}>/ 100</span>
      )}
    </div>
  )
}

function formatDate(d) {
  if (!d) return '\u2014'
  const date = new Date(d)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  if (Math.abs(diff) < 86400000) {
    return date.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString()
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Qoralama' },
  { value: 'active', label: 'Faol' },
  { value: 'archived', label: 'Arxivlangan' },
]

function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${className}`} style={{ borderColor: 'oklch(0.92 0.005 255)' }}>
      <h2 className="mb-4 text-base font-semibold" style={{ color: 'oklch(0.20 0.07 255)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
        {label}
      </label>
      {children}
    </div>
  )
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
  const [showLinkExpiry, setShowLinkExpiry] = useState(null)
  const [expiryInput, setExpiryInput] = useState('')

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'oklch(0.82 0.08 255)', borderTopColor: 'oklch(0.55 0.18 255)' }} />
          Imtihon yuklanmoqda...
        </div>
      </div>
    )
  }

  if (examError || !exam) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="animate-fade-in max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-3xl" style={{ color: 'oklch(0.55 0.17 30)' }}>&#9888;</div>
          <h2 className="mb-1 text-lg font-bold" style={{ color: 'oklch(0.20 0.07 255)' }}>
            Imtihon topilmadi
          </h2>
          <p className="text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
            {examError?.message || "Ushbu imtihon mavjud emas yoki sizda ruxsat yo'q."}
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
        id: examId, title, description,
        duration_minutes: parseInt(duration, 10), status,
      })
      setDirty(false)
      toast("O'zgarishlar saqlandi.", 'success')
    } catch { toast("Saqlashda xatolik yuz berdi.", 'error') }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validationErr = validateExamFile(file)
    if (validationErr) { setUploadError(validationErr); if (fileInputRef.current) fileInputRef.current.value = ''; return }
    setUploadError(null); setUploading(true)
    try { await uploadFile.mutateAsync({ examId, file }); toast("Fayl yuklandi.", 'success') }
    catch (err) { setUploadError(err.message || "Fayl yuklashda xatolik.") }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteFile = async (f) => {
    try { await deleteFile.mutateAsync({ id: f.id, filePath: f.file_path, examId }); toast("Fayl o'chirildi.", 'success') }
    catch { toast("Faylni o'chirishda xatolik.", 'error') }
  }

  const handleGenerateLink = async () => {
    try { await createLink.mutateAsync({ examId }); toast("Yangi imtihon kodi yaratildi.", 'success') }
    catch { toast("Kod yaratishda xatolik.", 'error') }
  }

  const handleDeleteLink = async (link) => {
    try { await deleteLink.mutateAsync({ id: link.id, examId }); toast("Imtihon kodi o'chirildi.", 'success') }
    catch { toast("Kodni o'chirishda xatolik.", 'error') }
  }

  const handleCopyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link.token)
      setCopiedId(link.id)
      setTimeout(() => setCopiedId(null), 2000)
      toast("Imtihon kodi nusxalandi.", 'success')
    } catch { toast("Nusxalashda xatolik.", 'error') }
  }

  const handleSaveExpiry = async (link) => {
    try {
      await updateLink.mutateAsync({ id: link.id, examId, expires_at: expiryInput || null })
      setShowLinkExpiry(null); setExpiryInput('')
      toast("Amal qilish muddati yangilandi.", 'success')
    } catch { toast("Muddati yangilashda xatolik.", 'error') }
  }

  const handleDownloadZip = async (sub) => {
    if (!sub.file_path) return
    const { data, error } = await supabase.storage.from('submissions').createSignedUrl(sub.file_path, 3600)
    if (error || !data) { toast("Faylni yuklab olish havolasini yaratishda xatolik.", 'error'); return }
    window.open(data.signedUrl, '_blank')
  }

  const handleGrade = async ({ id, grade }) => {
    try { await gradeSubmission.mutateAsync({ id, grade }); toast(grade != null ? "Baho saqlandi." : "Baho o'chirildi.", 'success') }
    catch { toast("Bahoni saqlashda xatolik.", 'error') }
  }

  const linkExpired = (link) => link.expires_at && new Date(link.expires_at) < new Date()

  let filtered = submissions || []
  if (filterStatus !== 'all') filtered = filtered.filter((s) => s.status === filterStatus)
  if (gradeFilter === 'graded') filtered = filtered.filter((s) => s.grade != null)
  else if (gradeFilter === 'ungraded') filtered = filtered.filter((s) => s.grade == null)
  filtered.sort((a, b) => {
    if (sortBy === 'submitted_at') {
      const ta = a.submitted_at || a.created_at
      const tb = b.submitted_at || b.created_at
      return tb.localeCompare(ta)
    }
    if (sortBy === 'student_name') return a.student_name.localeCompare(b.student_name)
    return 0
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-xl font-bold sm:text-2xl animate-fade-in" style={{ color: 'oklch(0.15 0.02 255)' }}>
        {exam.title}
      </h1>

      <div className="space-y-5">
        <SectionCard title="Imtihon ma'lumotlari">
          <form onSubmit={handleSave}>
            <DetailRow label="Imtihon nomi">
              <input type="text" required
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
                style={{ borderColor: 'oklch(0.90 0.01 255)', color: 'oklch(0.15 0.02 255)', '--tw-ring-color': 'oklch(0.73 0.12 255)' }}
                value={title}
                onChange={(e) => { setTitle(e.target.value); setDirty(true) }} />
            </DetailRow>
            <DetailRow label="Tavsif">
              <textarea rows={3}
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
                style={{ borderColor: 'oklch(0.90 0.01 255)', color: 'oklch(0.15 0.02 255)', '--tw-ring-color': 'oklch(0.73 0.12 255)' }}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setDirty(true) }} />
            </DetailRow>
            <div className="mb-4 flex gap-4">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
                  Davomiyligi (daqiqa)
                </label>
                <input type="number" required min={1}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
                  style={{ borderColor: 'oklch(0.90 0.01 255)', color: 'oklch(0.15 0.02 255)', '--tw-ring-color': 'oklch(0.73 0.12 255)' }}
                  value={duration}
                  onChange={(e) => { setDuration(e.target.value); setDirty(true) }} />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium" style={{ color: 'oklch(0.30 0.02 255)' }}>
                  Holat
                </label>
                <select
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2"
                  style={{ borderColor: 'oklch(0.90 0.01 255)', color: 'oklch(0.15 0.02 255)', '--tw-ring-color': 'oklch(0.73 0.12 255)' }}
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setDirty(true) }}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" disabled={!dirty || updateExam.isPending}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
              style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}>
              {updateExam.isPending ? 'Saqlanmoqda...' : "O'zgarishlarni saqlash"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Imtihon materiallari va fayllari">
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov,.avi,.pdf,.doc,.docx,.ppt,.pptx,.txt"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-white file:transition-all file:hover:brightness-110 file:bg-[oklch(0.55_0.18_255)]"
            />
            {uploading && <p className="mt-1.5 text-xs font-medium" style={{ color: 'oklch(0.55 0.18 255)' }}>Fayl yuklanmoqda...</p>}
            {uploadError && <p className="mt-1.5 text-xs font-medium" style={{ color: 'oklch(0.55 0.17 30)' }}>{uploadError}</p>}
            <p className="mt-2 text-xs" style={{ color: 'oklch(0.55 0.03 255)' }}>
              Ruxsat etilgan: <strong>ZIP arxivlar, PNG / Rasmlar, Videolar (MP4, WebM, MOV)</strong>, PDF, Word, PowerPoint, Matn. Maksimal hajm: 100 MB.
            </p>
          </div>
          {files && files.length > 0 ? (
            <ul className="divide-y rounded-xl border p-1" style={{ borderColor: 'oklch(0.92 0.005 255)' }}>
              {files.map((f) => {
                const isImage = f.file_name.match(/\.(png|jpg|jpeg|gif|webp)$/i)
                const isVideo = f.file_name.match(/\.(mp4|webm|mov|avi)$/i)
                const isZip = f.file_name.match(/\.zip$/i)
                const fileTypeLabel = isImage ? '[Rasm]' : isVideo ? '[Video]' : isZip ? '[ZIP]' : '[Hujjat]'
                return (
                  <li key={f.id} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {fileTypeLabel}
                      </span>
                      <span className="truncate text-sm font-medium" style={{ color: 'oklch(0.25 0.02 255)' }}>
                        {f.file_name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(f)}
                      className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ backgroundColor: 'oklch(0.93 0.05 30)', color: 'oklch(0.40 0.12 30)' }}
                    >
                      O'chirish
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: 'oklch(0.65 0.02 255)' }}>Hali materiallar yuklanmagan.</p>
          )}
        </SectionCard>

        <SectionCard title="Imtihon kodlari va kirish">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
              Talabalar imtihonni boshlash uchun ushbu 6 xonali kohni Talabalar sahifasida kiritadilar.
            </p>
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={createLink.isPending}
              className="cursor-pointer shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
              style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
            >
              {createLink.isPending ? 'Yaratilmoqda...' : '+ Yangi kod yaratish'}
            </button>
          </div>
          {links && links.length > 0 ? (
            <div className="space-y-3">
              {links.map((link) => {
                const expired = linkExpired(link)
                const pinDisplay = link.token.length === 6 ? `${link.token.slice(0, 3)} - ${link.token.slice(3)}` : link.token
                return (
                  <div
                    key={link.id}
                    className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                    style={{
                      borderColor: expired ? 'oklch(0.90 0.08 30)' : 'oklch(0.90 0.03 255)',
                      backgroundColor: expired ? 'oklch(0.98 0.02 30)' : 'oklch(0.985 0.005 255)',
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Imtihon kodi:
                        </span>
                        <span className="font-mono text-2xl font-black tracking-wider" style={{ color: expired ? 'oklch(0.50 0.12 30)' : 'oklch(0.40 0.18 255)' }}>
                          {pinDisplay}
                        </span>
                        {expired ? (
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'oklch(0.93 0.05 30)', color: 'oklch(0.40 0.12 30)' }}>
                            Muddati o'tgan
                          </span>
                        ) : (
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'oklch(0.92 0.05 145)', color: 'oklch(0.35 0.10 145)' }}>
                            Faol
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs" style={{ color: 'oklch(0.60 0.02 255)' }}>
                        Yaratilgan: {formatDate(link.created_at)}
                        {link.expires_at && <> &bull; Tugash vaqti: <strong className="font-medium">{formatDate(link.expires_at)}</strong></>}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {showLinkExpiry === link.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="datetime-local"
                            className="rounded-lg border px-2 py-1.5 text-xs"
                            style={{ borderColor: 'oklch(0.90 0.01 255)' }}
                            value={expiryInput}
                            onChange={(e) => setExpiryInput(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveExpiry(link)}
                            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium text-white"
                            style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
                          >
                            Saqlash
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowLinkExpiry(null); setExpiryInput('') }}
                            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium"
                            style={{ backgroundColor: 'oklch(0.93 0.01 255)', color: 'oklch(0.45 0.02 255)' }}
                          >
                            Bekor qilish
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowLinkExpiry(link.id)
                            setExpiryInput(link.expires_at ? new Date(link.expires_at).toISOString().slice(0, 16) : '')
                          }}
                          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                          style={{ backgroundColor: 'oklch(0.93 0.03 255)', color: 'oklch(0.35 0.08 255)' }}
                        >
                          {link.expires_at ? "Muddati o'zgartirish" : 'Muddati belgilash'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyLink(link)}
                        className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:brightness-110"
                        style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}
                      >
                        {copiedId === link.id ? 'Nusxalandi!' : 'Kodni nusxalash'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLink(link)}
                        className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                        style={{ backgroundColor: 'oklch(0.93 0.05 30)', color: 'oklch(0.40 0.12 30)' }}
                      >
                        O'chirish
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'oklch(0.65 0.02 255)' }}>Hali imtihon kodi yaratilmagan.</p>
          )}
        </SectionCard>

        <SectionCard title="Topshirilgan ishlar">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select className="rounded-xl border px-3 py-2 text-xs font-medium"
              style={{ borderColor: 'oklch(0.90 0.01 255)', color: 'oklch(0.35 0.02 255)' }}
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Barcha holatlar</option>
              <option value="in_progress">Bajarilmoqda</option>
              <option value="submitted">Topshirildi</option>
              <option value="expired">Muddati o'tgan</option>
            </select>
            <select className="rounded-xl border px-3 py-2 text-xs font-medium"
              style={{ borderColor: 'oklch(0.90 0.01 255)', color: 'oklch(0.35 0.02 255)' }}
              value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
              <option value="all">Barcha baholar</option>
              <option value="graded">Baholangan</option>
              <option value="ungraded">Baholanmagan</option>
            </select>
            <select className="rounded-xl border px-3 py-2 text-xs font-medium"
              style={{ borderColor: 'oklch(0.90 0.01 255)', color: 'oklch(0.35 0.02 255)' }}
              value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="submitted_at">Sana bo'yicha</option>
              <option value="student_name">Ism bo'yicha</option>
            </select>
          </div>

          {subsLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'oklch(0.82 0.08 255)', borderTopColor: 'oklch(0.55 0.18 255)' }} />
              Topshiriqlar yuklanmoqda...
            </div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium" style={{ borderColor: 'oklch(0.92 0.005 255)', color: 'oklch(0.55 0.03 255)' }}>
                    <th className="pb-2.5 pr-4 font-medium">Talaba</th>
                    <th className="pb-2.5 pr-4 font-medium">Holat</th>
                    <th className="pb-2.5 pr-4 font-medium">Topshirilgan vaqt</th>
                    <th className="pb-2.5 pr-4 font-medium">Topshiriq fayli</th>
                    <th className="pb-2.5 font-medium">Baho</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'oklch(0.92 0.005 255)' }}>
                  {filtered.map((sub) => (
                    <tr key={sub.id} className="transition-colors hover:bg-[oklch(0.975_0.005_255)]">
                      <td className="py-3 pr-4 font-medium" style={{ color: 'oklch(0.20 0.07 255)' }}>
                        {sub.student_name}
                      </td>
                      <td className="py-3 pr-4"><StatusBadge status={sub.status} /></td>
                      <td className="py-3 pr-4 text-sm" style={{ color: 'oklch(0.55 0.03 255)' }}>
                        {sub.submitted_at ? formatDate(sub.submitted_at) : '\u2014'}
                      </td>
                      <td className="py-3 pr-4">
                        {sub.file_path ? (
                          <button type="button" onClick={() => handleDownloadZip(sub)}
                            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110"
                            style={{ backgroundColor: 'oklch(0.55 0.18 255)' }}>
                            Yuklab olish
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: 'oklch(0.65 0.02 255)' }}>{'\u2014'}</span>
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
            <p className="py-6 text-sm" style={{ color: 'oklch(0.65 0.02 255)' }}>
              {submissions && submissions.length > 0
                ? 'Filtrga mos keladigan topshiriqlar topilmadi.'
                : 'Hali topshiriqlar yuklanmagan.'}
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
