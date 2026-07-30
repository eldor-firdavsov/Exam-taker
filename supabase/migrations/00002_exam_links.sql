-- ============================================================
-- Exam shareable links + public-read functions
-- ============================================================

-- 1. EXAM_LINKS ------------------------------------------------
CREATE TABLE exam_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id    UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE exam_links ENABLE ROW LEVEL SECURITY;

-- teachers can manage links only for exams they own
CREATE POLICY "exam_links_select_own" ON exam_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = exam_links.exam_id
        AND exams.teacher_id = auth.uid()
    )
  );

CREATE POLICY "exam_links_insert_own" ON exam_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = exam_links.exam_id
        AND exams.teacher_id = auth.uid()
    )
  );

CREATE POLICY "exam_links_delete_own" ON exam_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = exam_links.exam_id
        AND exams.teacher_id = auth.uid()
    )
  );


-- 2. PUBLIC-READ FUNCTIONS (SECURITY DEFINER) ------------------
-- These bypass RLS so anonymous students can read exam data
-- through a valid token without any direct table access.

CREATE OR REPLACE FUNCTION get_exam_by_token(p_token TEXT)
RETURNS TABLE (id UUID, title TEXT, description TEXT, duration_minutes INT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.title, e.description, e.duration_minutes, e.status
  FROM public.exams e
  JOIN public.exam_links el ON el.exam_id = e.id
  WHERE el.token = p_token;
END;
$$;

CREATE OR REPLACE FUNCTION get_exam_files_by_token(p_token TEXT)
RETURNS TABLE (id UUID, file_path TEXT, file_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT ef.id, ef.file_path, ef.file_name
  FROM public.exam_files ef
  JOIN public.exam_links el ON el.exam_id = ef.exam_id
  WHERE el.token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION get_exam_by_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_exam_files_by_token TO anon, authenticated;
