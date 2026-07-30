import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 16 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('')
}

export function useExamLinks(examId) {
  return useQuery({
    queryKey: ['exam-links', examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_links')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!examId,
  })
}

export function useCreateExamLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ examId, expires_at }) => {
      const payload = { exam_id: examId, token: generateToken() }
      if (expires_at) payload.expires_at = expires_at

      const { data, error } = await supabase
        .from('exam_links')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['exam-links', variables.examId] }),
  })
}

export function useUpdateExamLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, examId, expires_at }) => {
      const { data, error } = await supabase
        .from('exam_links')
        .update({ expires_at })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['exam-links', variables.examId] }),
  })
}

export function useDeleteExamLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, examId }) => {
      const { error } = await supabase.from('exam_links').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['exam-links', variables.examId] }),
  })
}
