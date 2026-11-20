-- Added column archived_at to habits table
-- This migration is additive and preserves existing data.

ALTER TABLE public.habits
  ADD COLUMN archived_at timestamptz;

-- No default; NULL indicates no archive timestamp. All existing habits get NULL.