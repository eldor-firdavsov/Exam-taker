import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { useExam, useUpdateExam } from '../hooks/useExams'
import { useExamFiles, useUploadFile, useDeleteFile, validateExamFile } from '../hooks/useExamFiles'
import { useExamLinks, useCreateExamLink, useUpdateExamLink, useDeleteExamLink } from '../hooks/useExamLinks'
import { useSubmissions, useGradeSubmission } from '../hooks/useSubmissions'
import { ArrowLeft, Radio, FileText, Upload, Copy, Trash2, CheckCircle2, Clock, AlertTriangle, Download } from 'lucide-react'

const STATUS_BADGES = {
  in_progress: { bg: 'bg-blue-50', text: 'text-[#228BE6]', border: 'border-blue-200', label: 'Bajarilmoqda' },
  submitted: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Topshirildi' },
  expired: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: "Vaqti tugadi" },
}

function StatusBadge({ status }) {
  const s = STATUS_BADGES[status] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: status }
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
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
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={100}
        className="w-14 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#228BE6]"
        value={value}
        onChange={(e) => setValue(e.target.value === '' ? '' : e.target.value)}
        onBlur={handleBlur}
        disabled={saving}
      />
      {saving && <span className="text-[10px] text-slate-400">saqlanmoqda...</span>}
      {submission.grade != null && !saving && (
        <span className="text-xs text-slate-400 font-semibold">/ 100</span>
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
    <div className={`rounded-lg border border-slate-200 bg-white p-5 ${className}`}>
      <h2 className="mb-3 text-sm font-bold text-slate-900 uppercase tracking-wider">
        {title}
      </h2>
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

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-xs font-medium text-slate-500">Imtihon yuklanmoqda...</div>
      </div>
    )
  }

  if (examError || !exam) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
          <h2 className="mb-1 text-base font-bold text-slate-900">
            Imtihon topilmadi
          </h2>
          <p className="text-xs text-slate-500">
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link to="/dashboard" className="text-xs font-semibold text-[#228BE6] hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Imtihonlar ro'yxatiga qaytish</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            {exam.title}
          </h1>
        </div>

        <Link
          to="/dashboard/live"
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors self-start sm:self-auto"
        >
          <Radio className="h-3.5 w-3.5 text-emerald-600" />
          <span>Jonli monitoring</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details & Files */}
        <div className="lg:col-span-1 space-y-6">
          <SectionCard title="Imtihon sozlamalari">
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Imtihon nomi</label>
                <input type="text" required
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-[#228BE6] focus:outline-none"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setDirty(true) }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Tavsif</label>
                <textarea rows={3}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-[#228BE6] focus:outline-none"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setDirty(true) }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Davomiyligi (m)</label>
                  <input type="number" required min={1}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-[#228BE6] focus:outline-none"
                    value={duration}
                    onChange={(e) => { setDuration(e.target.value); setDirty(true) }} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Holat</label>
                  <select
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-[#228BE6] focus:outline-none"
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setDirty(true) }}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={!dirty || updateExam.isPending}
                className="w-full rounded bg-[#228BE6] py-2 text-xs font-semibold text-white hover:bg-[#1C7ED6] disabled:opacity-50 transition-colors">
                {updateExam.isPending ? 'Saqlanmoqda...' : "Saqlash"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Materiallar (Fayllar)">
            <div className="mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov,.avi,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-xs text-slate-500 file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
              {uploading && <p className="mt-1 text-xs font-medium text-[#228BE6]">Yuklanmoqda...</p>}
              {uploadError && <p className="mt-1 text-xs font-semibold text-red-600">{uploadError}</p>}
            </div>
            {files && files.length > 0 ? (
              <ul className="divide-y divide-slate-100 rounded border border-slate-200">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between p-2">
                    <span className="truncate text-xs font-semibold text-slate-800 max-w-[150px]">
                      {f.file_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(f)}
                      className="cursor-pointer text-slate-400 hover:text-red-600"
                      title="O'chirish"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">Materiallar biriktirilmagan.</p>
            )}
          </SectionCard>
        </div>

        {/* Right: Room PIN Links & Submissions */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Imtihon kodlari (Room PIN)">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Talabalar ushbu 6 xonali PIN kod orqali imtihonga kirishadi.
              </p>
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={createLink.isPending}
                className="cursor-pointer rounded bg-[#228BE6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1C7ED6] disabled:opacity-50"
              >
                + Yangi PIN
              </button>
            </div>
            {links && links.length > 0 ? (
              <div className="space-y-2">
                {links.map((link) => {
                  const expired = linkExpired(link)
                  const pinDisplay = link.token.length === 6 ? `${link.token.slice(0, 3)} - ${link.token.slice(3)}` : link.token
                  return (
                    <div
                      key={link.id}
                      className={`flex items-center justify-between p-3 rounded border ${
                        expired ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xl font-bold text-slate-900 tracking-wider">
                            {pinDisplay}
                          </span>
                          {expired ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              Muddati o'tgan
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Faol
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Yaratilgan: {formatDate(link.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(link)}
                          className="cursor-pointer rounded bg-[#FABB00] px-2.5 py-1 text-xs font-semibold text-slate-900 hover:brightness-95 flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span>{copiedId === link.id ? 'Nusxalandi!' : 'Kodni nusxalash'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLink(link)}
                          className="cursor-pointer p-1 text-slate-400 hover:text-red-600"
                          title="O'chirish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Hali kirish kodi yaratilmagan.</p>
            )}
          </SectionCard>

          <SectionCard title="Topshirilgan ishlar va Baholash">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Barcha holatlar</option>
                <option value="in_progress">Bajarilmoqda</option>
                <option value="submitted">Topshirildi</option>
                <option value="expired">Muddati o'tgan</option>
              </select>
              <select className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                <option value="all">Barcha baholar</option>
                <option value="graded">Baholangan</option>
                <option value="ungraded">Baholanmagan</option>
              </select>
            </div>

            {subsLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Topshiriqlar yuklanmoqda...</div>
            ) : filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-2 pr-4">Talaba</th>
                      <th className="pb-2 pr-4">Holat</th>
                      <th className="pb-2 pr-4">Vaqt</th>
                      <th className="pb-2 pr-4">Fayl</th>
                      <th className="pb-2">Baho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 pr-4 font-semibold text-slate-900">{sub.student_name}</td>
                        <td className="py-2.5 pr-4"><StatusBadge status={sub.status} /></td>
                        <td className="py-2.5 pr-4 text-xs text-slate-500">{sub.submitted_at ? formatDate(sub.submitted_at) : '\u2014'}</td>
                        <td className="py-2.5 pr-4">
                          {sub.file_path ? (
                            <button type="button" onClick={() => handleDownloadZip(sub)}
                              className="cursor-pointer rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-800 inline-flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              Yuklab olish (.zip)
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">&mdash;</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <GradeCell submission={sub} onGrade={handleGrade} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4 text-xs text-slate-400 text-center italic">Topshiriqlar topilmadi.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
