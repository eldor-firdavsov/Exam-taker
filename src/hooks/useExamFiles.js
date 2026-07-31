import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed', 'application/x-zip',
  'text/plain',
]
const MAX_SIZE = 100 * 1024 * 1024

export function validateExamFile(file) {
  const extMatch = file.name.match(/\.(pdf|doc|docx|ppt|pptx|txt|png|jpg|jpeg|gif|webp|mp4|webm|mov|avi|zip)$/i)
  if (!ALLOWED_TYPES.includes(file.type) && !extMatch) {
    return "Qo'llab-quvvatlanmaydigan fayl formati. Ruxsat etilgan: ZIP, PNG / Rasmlar, Videolar (MP4, WebM, MOV), PDF, Word, PowerPoint, Matn."
  }
  if (file.size > MAX_SIZE) {
    return "Fayl hajmi 100 MB limitidan oshmasligi kerak."
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
      if (uploadError) throw new Error("Faylni saqlash xotirasiga yuklashda xatolik.")

      const { error: dbError } = await supabase.from('exam_files').insert({
        exam_id: examId,
        file_path: filePath,
        file_name: file.name,
      })
      if (dbError) {
        await supabase.storage.from('exam-materials').remove([filePath])
        throw new Error("Fayl ma'lumotlarini saqlashda xatolik.")
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
      if (storageError) throw new Error("Faylni saqlash xotirasidan o'chirishda xatolik.")

      const { error: dbError } = await supabase
        .from('exam_files')
        .delete()
        .eq('id', id)
      if (dbError) throw new Error("Fayl yozuvini o'chirishda xatolik.")
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['exam-files', variables.examId] }),
  })
}
