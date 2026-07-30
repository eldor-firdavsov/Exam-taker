-- ============================================================
-- Grading columns + teacher update policy for submissions
-- ============================================================

ALTER TABLE submissions
  ADD COLUMN grade    INT CHECK (grade >= 0 AND grade <= 100),
  ADD COLUMN graded_at TIMESTAMPTZ;

-- teachers can update submissions for exams they own
CREATE POLICY "submissions_teacher_update" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM exam_links el
      JOIN exams e ON e.id = el.exam_id
      WHERE el.id = submissions.exam_link_id
        AND e.teacher_id = auth.uid()
    )
  );
