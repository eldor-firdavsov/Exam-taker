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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submissions'] }),
  })
}
