-- ============================================================
-- Submissions + timed exam flow
-- ============================================================

-- 1. SUBMISSIONS -----------------------------------------------
CREATE TABLE submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_link_id  UUID NOT NULL REFERENCES exam_links(id) ON DELETE CASCADE,
  student_name  TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at   TIMESTAMPTZ NOT NULL,
  submitted_at  TIMESTAMPTZ,
  file_path     TEXT,
  status        TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'submitted', 'expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- allow anon to start a submission (INSERT)
CREATE POLICY "submissions_anon_insert" ON submissions
  FOR INSERT WITH CHECK (auth.role() = 'anon');

-- anon SELECT/UPDATE handled exclusively via Edge Functions
-- (no direct table access for anon)

-- teachers can see submissions for exams they own
CREATE POLICY "submissions_teacher_select" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exam_links el
      JOIN exams e ON e.id = el.exam_id
      WHERE el.id = submissions.exam_link_id
        AND e.teacher_id = auth.uid()
    )
  );


-- 2. STORAGE – submissions bucket ------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

-- teachers can download submissions for exams they own
CREATE POLICY "submissions_storage_select_teacher" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'submissions'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM submissions s
      JOIN exam_links el ON el.id = s.exam_link_id
      JOIN exams e ON e.id = el.exam_id
      WHERE s.id::text = (storage.foldername(name))[1]
        AND e.teacher_id = auth.uid()
    )
  );
