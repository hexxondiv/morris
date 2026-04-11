-- Migration: Create cases and case_files tables
-- Description: Tables for handling case reports/help requests from the public

-- Cases table
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_reference_id TEXT UNIQUE NOT NULL,

  -- Contact Information
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  state_id INTEGER NOT NULL REFERENCES states(id),
  lga_id INTEGER NOT NULL REFERENCES lgas(id),
  town TEXT NOT NULL,

  -- Reporting Information
  reporting_for TEXT NOT NULL CHECK (reporting_for IN ('myself', 'someone_else')),
  beneficiary_name TEXT,
  relationship TEXT,

  -- Case Details
  help_type TEXT NOT NULL CHECK (help_type IN (
    'school_fees',
    'educational_materials',
    'infrastructure',
    'scholarship',
    'health_welfare',
    'other'
  )),
  description TEXT NOT NULL,

  -- Consent Flags
  info_confirmed BOOLEAN NOT NULL DEFAULT false,
  contact_consent BOOLEAN NOT NULL DEFAULT false,
  updates_consent BOOLEAN DEFAULT false,

  -- Metadata
  user_id TEXT, -- Clerk user ID if authenticated
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'reviewing',
    'approved',
    'rejected',
    'completed'
  )),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Case files table for multiple image uploads
CREATE TABLE IF NOT EXISTS case_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- in bytes
  mime_type TEXT NOT NULL, -- image/jpeg, image/png, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_state_id ON cases(state_id);
CREATE INDEX IF NOT EXISTS idx_cases_lga_id ON cases(lga_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_files_case_id ON case_files(case_id);

-- Function to generate case reference IDs
CREATE OR REPLACE FUNCTION generate_case_reference_id()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_number INTEGER;
  reference_id TEXT;
BEGIN
  -- Get current year
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Get count of cases this year + 1
  SELECT COUNT(*) + 1 INTO sequence_number
  FROM cases
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Format: CASE-YYYY-NNNNNN (e.g., CASE-2025-000001)
  reference_id := 'CASE-' || year_part || '-' || LPAD(sequence_number::TEXT, 6, '0');

  RETURN reference_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate case reference ID
CREATE OR REPLACE FUNCTION set_case_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_reference_id IS NULL OR NEW.case_reference_id = '' THEN
    NEW.case_reference_id := generate_case_reference_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_case_reference_id
  BEFORE INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION set_case_reference_id();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE cases IS 'Stores case reports and help requests from the public';
COMMENT ON TABLE case_files IS 'Stores multiple file attachments for each case';
COMMENT ON COLUMN cases.case_reference_id IS 'Unique human-readable case identifier (e.g., CASE-2025-000001)';
COMMENT ON COLUMN cases.reporting_for IS 'Whether the reporter is reporting for themselves or someone else';
COMMENT ON COLUMN cases.help_type IS 'Type of assistance needed';
COMMENT ON COLUMN cases.info_confirmed IS 'User confirmed information is truthful';
COMMENT ON COLUMN cases.contact_consent IS 'User consents to being contacted for verification';
COMMENT ON COLUMN cases.updates_consent IS 'User wants to receive updates about the case';
