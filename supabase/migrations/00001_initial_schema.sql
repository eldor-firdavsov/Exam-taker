-- ============================================================
-- IT Exam Platform — Initial Schema
-- ============================================================

-- 1. PROFILES -------------------------------------------------
CREATE TABLE profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'teacher',
  full_name TEXT
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- auto-create profile row on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- 2. EXAMS ----------------------------------------------------
CREATE TABLE exams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id       UUID NOT NULL REFERENCES profiles(id),
  title            TEXT NOT NULL,
  description      TEXT,
  duration_minutes INT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'active', 'archived')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exams_select_own" ON exams
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "exams_insert_own" ON exams
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "exams_update_own" ON exams
  FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "exams_delete_own" ON exams
  FOR DELETE USING (teacher_id = auth.uid());


-- 3. EXAM_FILES -----------------------------------------------
CREATE TABLE exam_files (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id   UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL
);

ALTER TABLE exam_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_files_select_own" ON exam_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = exam_files.exam_id
        AND exams.teacher_id = auth.uid()
    )
  );

CREATE POLICY "exam_files_insert_own" ON exam_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = exam_files.exam_id
        AND exams.teacher_id = auth.uid()
    )
  );

CREATE POLICY "exam_files_delete_own" ON exam_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = exam_files.exam_id
        AND exams.teacher_id = auth.uid()
    )
  );


-- 4. STORAGE – exam-materials bucket --------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-materials', 'exam-materials', false)
ON CONFLICT (id) DO NOTHING;

-- authenticated users can list / download any file in the bucket
CREATE POLICY "storage_select_auth" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'exam-materials' AND auth.role() = 'authenticated');

-- insert / delete only if the owning folder matches the teacher
CREATE POLICY "storage_insert_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'exam-materials'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id::text = (storage.foldername(name))[1]
        AND exams.teacher_id = auth.uid()
    )
  );

CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'exam-materials'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id::text = (storage.foldername(name))[1]
        AND exams.teacher_id = auth.uid()
    )
  );
