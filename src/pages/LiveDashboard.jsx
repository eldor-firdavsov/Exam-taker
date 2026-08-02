import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAllTeacherSubmissions, useExtendTime } from '../hooks/useSubmissions'
import { useToast } from '../components/Toast'
import { FileText, Clock, CheckCircle2, AlertTriangle, RefreshCw, Plus, ChevronDown, ChevronUp } from 'lucide-react'

function formatTimeRemaining(deadlineAt, now) {
  if (!deadlineAt) return { display: '0:00', totalSeconds: 0, expired: true }
  const diff = new Date(deadlineAt).getTime() - now
  if (diff <= 0) return { display: '0:00', totalSeconds: 0, expired: true }

  const totalSeconds = Math.floor(diff / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return {
    display: `${m}:${String(s).padStart(2, '0')}`,
    totalSeconds,
    expired: false
  }
}

function formatTime(d) {
  if (!d) return '\u2014'
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function LiveDashboard() {
  const toast = useToast()
  const { data, isLoading, error, refetch, isFetching } = useAllTeacherSubmissions(10000)
  const extendTime = useExtendTime()

  const [now, setNow] = useState(Date.now())
  const [customInputId, setCustomInputId] = useState(null)
  const [customMinutes, setCustomMinutes] = useState('')
  const [expandedExamId, setExpandedExamId] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <RefreshCw className="h-4 w-4 animate-spin text-[#228BE6]" />
          Jonli monitoring ma'lumotlari yuklanmoqda...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-center text-red-800">
          <h3 className="font-bold text-sm mb-1">Ma'lumotlarni yuklashda xatolik</h3>
          <p className="text-xs">{error.message || 'Iltimos, qaytadan urinib ko\'ring.'}</p>
        </div>
      </div>
    )
  }

  const { exams = [], links = [], submissions = [] } = data || {}

  const linkToExamMap = {}
  links.forEach(l => {
    linkToExamMap[l.id] = l.exam_id
  })

  const examSubmissionsMap = {}
  exams.forEach(e => {
    examSubmissionsMap[e.id] = []
  })

  let totalActiveExams = 0
  let totalInProgressStudents = 0
  let totalSubmittedToday = 0

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  submissions.forEach(sub => {
    const examId = linkToExamMap[sub.exam_link_id]
    if (examId && examSubmissionsMap[examId]) {
      examSubmissionsMap[examId].push(sub)
    }

    const isSubmitted = sub.status === 'submitted'
    const isDeadlinePassed = sub.deadline_at && new Date(sub.deadline_at).getTime() <= now
    const isInProgress = sub.status === 'in_progress' && !isDeadlinePassed

    if (isInProgress) totalInProgressStudents++
    if (isSubmitted && new Date(sub.submitted_at) >= startOfToday) totalSubmittedToday++
  })

  totalActiveExams = exams.filter(e => e.status === 'active').length

  const handleExtendTime = async (submission, addMins) => {
    if (!addMins || addMins <= 0) return
    try {
      await extendTime.mutateAsync({
        submissionId: submission.id,
        currentDeadline: submission.deadline_at,
        currentExtendedMinutes: submission.time_extended_minutes || 0,
        addMinutes: addMins
      })
      toast(`+${addMins} daqiqa qo'shildi (${submission.student_name})`, 'success')
      setCustomInputId(null)
      setCustomMinutes('')
    } catch {
      toast("Vaqt uzaytirishda xatolik yuz berdi.", 'error')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      {/* Title & Refetch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-300">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900">
              Jonli Monitoring Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              LIVE (10s refetch)
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Imtihon topshirayotgan talabalarni real vaqt rejimida kuzating va vaqt qo'shing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${isFetching ? 'animate-spin' : ''}`} />
          <span>{isFetching ? 'Yangilanmoqda...' : 'Hozir yangilash'}</span>
        </button>
      </div>

      {/* 1. SUMMARY CARDS - Crisp white cards on slate-100 canvas with slate-300 borders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Exams */}
        <div className="rounded-lg border border-slate-300 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">
              Faol imtihonlar
            </span>
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalActiveExams}</span>
            <span className="text-xs font-medium text-slate-600">ta imtihon jarayonda</span>
          </div>
        </div>

        {/* Students in Progress */}
        <div className="rounded-lg border border-slate-300 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">
              Hozir ishlayotganlar
            </span>
            <Clock className="h-4 w-4 text-[#228BE6]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#228BE6]">{totalInProgressStudents}</span>
            <span className="text-xs font-medium text-slate-600">ta talaba seansda</span>
          </div>
        </div>

        {/* Fully Submitted Today */}
        <div className="rounded-lg border border-slate-300 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">
              Bugun topshirganlar
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{totalSubmittedToday}</span>
            <span className="text-xs font-medium text-slate-600">ta to'liq yakunlandi</span>
          </div>
        </div>
      </div>

      {/* 2. ONGOING EXAMS LIST */}
      <div className="space-y-4">
        <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
          Imtihonlar bo'yicha talabalar faoliyati
        </h2>

        {exams.length === 0 ? (
          <div className="rounded-lg border border-slate-300 bg-white p-8 text-center">
            <p className="text-xs font-medium text-slate-500">Hali hech qanday imtihonlar yaratilmagan.</p>
          </div>
        ) : (
          exams.map((exam) => {
            const examSubs = examSubmissionsMap[exam.id] || []
            const isExpanded = expandedExamId === exam.id || expandedExamId === null

            const processedStudents = examSubs.map((sub) => {
              const { display, totalSeconds, expired } = formatTimeRemaining(sub.deadline_at, now)
              
              let effectiveStatus = sub.status
              if (sub.status === 'in_progress' && expired) {
                effectiveStatus = 'expired'
              }

              return {
                ...sub,
                effectiveStatus,
                timerDisplay: display,
                totalSeconds,
              }
            })

            processedStudents.sort((a, b) => {
              const order = { in_progress: 1, expired: 2, submitted: 3 }
              const diff = (order[a.effectiveStatus] || 4) - (order[b.effectiveStatus] || 4)
              if (diff !== 0) return diff
              if (a.effectiveStatus === 'in_progress') {
                return a.totalSeconds - b.totalSeconds
              }
              return new Date(b.created_at) - new Date(a.created_at)
            })

            const inProgCount = processedStudents.filter(s => s.effectiveStatus === 'in_progress').length
            const submittedCount = processedStudents.filter(s => s.effectiveStatus === 'submitted').length

            return (
              <div
                key={exam.id}
                className="rounded-lg border border-slate-300 bg-white overflow-hidden shadow-2xs"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => setExpandedExamId(isExpanded && expandedExamId === exam.id ? -1 : exam.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300">
                      {exam.duration_minutes}m
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/dashboard/exams/${exam.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-extrabold text-slate-900 hover:text-[#228BE6] text-sm transition-colors"
                        >
                          {exam.title}
                        </Link>
                        {exam.status === 'active' ? (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                            Faol
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-300">
                            {exam.status}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-600">
                        Jami talabalar: {processedStudents.length} ta ({inProgCount} jarayonda, {submittedCount} topshirdi)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500 text-xs font-bold">
                    {isExpanded && expandedExamId === exam.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Table View */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50/70">
                    {processedStudents.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-3">
                        Ushbu imtihonga hali talabalar kirmagan.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-300 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                              <th className="pb-2.5 pr-4">Talaba</th>
                              <th className="pb-2.5 pr-4">Holat</th>
                              <th className="pb-2.5 pr-4">Qolgan vaqt / Vaqt</th>
                              <th className="pb-2.5 text-right">Vaqt qo'shish</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {processedStudents.map((student) => {
                              const isInProgress = student.effectiveStatus === 'in_progress'
                              const isSubmitted = student.effectiveStatus === 'submitted'
                              const isUrgent = isInProgress && student.totalSeconds > 0 && student.totalSeconds <= 300

                              return (
                                <tr
                                  key={student.id}
                                  className={`transition-colors ${
                                    isSubmitted
                                      ? 'bg-emerald-50/50'
                                      : isUrgent
                                      ? 'bg-red-50/50'
                                      : 'hover:bg-white'
                                  }`}
                                >
                                  {/* Student Name */}
                                  <td className="py-3 pr-4">
                                    <div className="font-bold text-slate-900">
                                      {student.student_name}
                                    </div>
                                    {student.time_extended_minutes > 0 && (
                                      <span className="text-[10px] font-bold text-[#228BE6]">
                                        +{student.time_extended_minutes}m berildi
                                      </span>
                                    )}
                                  </td>

                                  {/* Status Badge */}
                                  <td className="py-3 pr-4">
                                    {isSubmitted ? (
                                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                                        To'liq topshirildi
                                      </span>
                                    ) : isInProgress ? (
                                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold border ${
                                        isUrgent
                                          ? 'bg-red-100 text-red-800 border-red-300'
                                          : 'bg-blue-100 text-blue-800 border-blue-300'
                                      }`}>
                                        <Clock className="h-3.5 w-3.5" />
                                        Jarayonda
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                                        Vaqti tugadi
                                      </span>
                                    )}
                                  </td>

                                  {/* Time Remaining */}
                                  <td className="py-3 pr-4 font-mono font-bold">
                                    {isInProgress ? (
                                      <span className={isUrgent ? 'text-red-700 font-extrabold text-sm' : 'text-slate-900'}>
                                        {student.timerDisplay}
                                      </span>
                                    ) : isSubmitted ? (
                                      <span className="text-xs font-sans text-slate-600 font-medium">
                                        Topshirildi: {formatTime(student.submitted_at)}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-sans text-slate-500 font-medium">
                                        Yakunlangan
                                      </span>
                                    )}
                                  </td>

                                  {/* Add Time Quick Buttons */}
                                  <td className="py-3 text-right">
                                    {isInProgress || student.effectiveStatus === 'expired' ? (
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleExtendTime(student, 5)}
                                          disabled={extendTime.isPending}
                                          className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50 shadow-2xs"
                                        >
                                          +5m
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleExtendTime(student, 10)}
                                          disabled={extendTime.isPending}
                                          className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50 shadow-2xs"
                                        >
                                          +10m
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleExtendTime(student, 15)}
                                          disabled={extendTime.isPending}
                                          className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50 shadow-2xs"
                                        >
                                          +15m
                                        </button>

                                        {customInputId === student.id ? (
                                          <form
                                            onSubmit={(e) => {
                                              e.preventDefault()
                                              handleExtendTime(student, parseInt(customMinutes, 10))
                                            }}
                                            className="flex items-center gap-1 ml-1"
                                          >
                                            <input
                                              type="number"
                                              min={1}
                                              max={180}
                                              autoFocus
                                              className="w-12 rounded border border-slate-400 bg-white px-1.5 py-0.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#228BE6]"
                                              placeholder="m"
                                              value={customMinutes}
                                              onChange={(e) => setCustomMinutes(e.target.value)}
                                            />
                                            <button
                                              type="submit"
                                              className="cursor-pointer rounded bg-[#228BE6] px-2 py-0.5 text-xs font-bold text-white"
                                            >
                                              OK
                                            </button>
                                          </form>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCustomInputId(student.id)
                                              setCustomMinutes('')
                                            }}
                                            className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 shadow-2xs"
                                          >
                                            <Plus className="h-3 w-3 inline" />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400 font-normal">
                                        &mdash;
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
