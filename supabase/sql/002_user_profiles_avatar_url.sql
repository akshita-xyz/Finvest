-- Run in Supabase SQL Editor if you already applied 001_user_profiles.sql.
-- Adds optional profile photo URL (synced from Auth user_metadata.avatar_url).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
