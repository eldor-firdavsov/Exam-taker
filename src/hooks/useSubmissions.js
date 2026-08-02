import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSubmissions(linkIds) {
  return useQuery({
    queryKey: ['submissions', linkIds],
    queryFn: async () => {
      if (!linkIds || linkIds.length === 0) return []
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .in('exam_link_id', linkIds)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!linkIds && linkIds.length > 0,
  })
}

// Live polling hook for teacher's live dashboard
export function useAllTeacherSubmissions(refetchInterval = 10000) {
  return useQuery({
    queryKey: ['live-submissions'],
    queryFn: async () => {
      // Fetch exams owned by current teacher
      const { data: exams, error: examsErr } = await supabase
        .from('exams')
        .select('id, title, duration_minutes, status, created_at')
        .order('created_at', { ascending: false })

      if (examsErr) throw examsErr
      if (!exams || exams.length === 0) return { exams: [], links: [], submissions: [] }

      const examIds = exams.map(e => e.id)
      
      // Fetch exam links
      const { data: links, error: linksErr } = await supabase
        .from('exam_links')
        .select('*')
        .in('exam_id', examIds)

      if (linksErr) throw linksErr

      const linkIds = (links || []).map(l => l.id)
      if (linkIds.length === 0) return { exams, links: [], submissions: [] }

      // Fetch submissions
      const { data: submissions, error: subsErr } = await supabase
        .from('submissions')
        .select('*')
        .in('exam_link_id', linkIds)
        .order('created_at', { ascending: false })

      if (subsErr) throw subsErr

      return { exams, links: links || [], submissions: submissions || [] }
    },
    refetchInterval,
  })
}

export function useGradeSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, grade }) => {
      const { data, error } = await supabase
        .from('submissions')
        .update({ grade, graded_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] })
      qc.invalidateQueries({ queryKey: ['live-submissions'] })
    },
  })
}

export function useExtendTime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ submissionId, currentDeadline, currentExtendedMinutes = 0, addMinutes }) => {
      const currentMs = new Date(currentDeadline).getTime()
      // Add extra minutes to existing deadline
      const newDeadline = new Date(currentMs + addMinutes * 60 * 1000).toISOString()
      const newExtendedMinutes = (currentExtendedMinutes || 0) + addMinutes

      const { data, error } = await supabase
        .from('submissions')
        .update({
          deadline_at: newDeadline,
          time_extended_minutes: newExtendedMinutes
        })
        .eq('id', submissionId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] })
      qc.invalidateQueries({ queryKey: ['live-submissions'] })
    },
  })
}
