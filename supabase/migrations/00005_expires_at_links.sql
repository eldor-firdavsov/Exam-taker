-- ============================================================
-- Add expires_at to exam_links for link-level expiry
-- ============================================================

ALTER TABLE exam_links
  ADD COLUMN expires_at TIMESTAMPTZ;
