-- Migration: Add time_extended_minutes column to submissions table
ALTER TABLE submissions 
  ADD COLUMN IF NOT EXISTS time_extended_minutes INT DEFAULT 0;

-- Update RLS policy if needed so teachers can update submissions for exams they own
DROP POLICY IF EXISTS "submissions_teacher_update" ON submissions;

CREATE POLICY "submissions_teacher_update" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM exam_links el
      JOIN exams e ON e.id = el.exam_id
      WHERE el.id = submissions.exam_link_id
        AND e.teacher_id = auth.uid()
    )
  );
