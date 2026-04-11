-- Migration: Add case_notes table for admin notes
-- Description: Allows admins to add timestamped notes to cases

-- Case notes table
CREATE TABLE IF NOT EXISTS case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  admin_user_id TEXT NOT NULL, -- Clerk user ID
  admin_name TEXT NOT NULL, -- Admin's full name for display
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_created_at ON case_notes(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE case_notes IS 'Stores admin notes/comments for case reports';
COMMENT ON COLUMN case_notes.admin_user_id IS 'Clerk user ID of the admin who created the note';
COMMENT ON COLUMN case_notes.admin_name IS 'Display name of the admin for showing in UI';
