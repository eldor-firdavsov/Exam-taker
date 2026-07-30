import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed',
  'text/plain',
]
const MAX_SIZE = 50 * 1024 * 1024

export function validateExamFile(file) {
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|ppt|pptx|txt|png|jpg|jpeg|gif|zip)$/i)) {
    return 'Unsupported file type. Allowed: PDF, Word, PowerPoint, images, ZIP, text files.'
  }
  if (file.size > MAX_SIZE) {
    return 'File exceeds 50 MB limit.'
  }
  return null
}

export function useExamFiles(examId) {
  return useQuery({
    queryKey: ['exam-files', examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_files')
        .select('*')
        .eq('exam_id', examId)
        .order('file_name')
      if (error) throw error
      return data
    },
    enabled: !!examId,
  })
}

export function useUploadFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ examId, file }) => {
      const err = validateExamFile(file)
      if (err) throw new Error(err)

      const filePath = `${examId}/${crypto.randomUUID()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('exam-materials')
        .upload(filePath, file)
      if (uploadError) throw new Error('Failed to upload file. Please try again.')

      const { error: dbError } = await supabase.from('exam_files').insert({
        exam_id: examId,
        file_path: filePath,
        file_name: file.name,
      })
      if (dbError) {
        await supabase.storage.from('exam-materials').remove([filePath])
        throw new Error('Failed to save file record.')
      }
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['exam-files', variables.examId] }),
  })
}

export function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, filePath, examId }) => {
      const { error: storageError } = await supabase.storage
        .from('exam-materials')
        .remove([filePath])
      if (storageError) throw new Error('Failed to delete file from storage.')

      const { error: dbError } = await supabase
        .from('exam_files')
        .delete()
        .eq('id', id)
      if (dbError) throw new Error('Failed to delete file record.')
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['exam-files', variables.examId] }),
  })
}
