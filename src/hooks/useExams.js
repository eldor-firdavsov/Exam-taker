import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useExams() {
  return useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useExam(id) {
  return useQuery({
    queryKey: ['exams', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, description, duration_minutes, expires_at }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: exam, error } = await supabase
        .from('exams')
        .insert({
          teacher_id: user.id,
          title,
          description,
          duration_minutes,
        })
        .select()
        .single()
      if (error) throw error

      // Auto-generate 6-digit Kahoot-style Room PIN link
      const pinCode = Math.floor(100000 + Math.random() * 900000).toString()
      const linkPayload = { exam_id: exam.id, token: pinCode }
      if (expires_at) linkPayload.expires_at = expires_at

      await supabase.from('exam_links').insert(linkPayload)

      return exam
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  })
}

export function useUpdateExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }) => {
      const { data, error } = await supabase
        .from('exams')
        .update(fields)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exams'] })
      qc.invalidateQueries({ queryKey: ['exams', data.id] })
    },
  })
}

export function useDeleteExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('exams').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  })
}
