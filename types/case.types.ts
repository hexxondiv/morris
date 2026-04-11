// types/case.types.ts
export type CaseStatus = "pending" | "reviewing" | "approved" | "rejected" | "completed";

export type HelpType =
  | "school_fees"
  | "educational_materials"
  | "infrastructure"
  | "scholarship"
  | "health_welfare"
  | "other";

export type ReportingFor = "myself" | "someone_else";

export interface CaseFile {
  id: string;
  case_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface Case {
  id: string;
  case_reference_id: string;

  // Contact Information
  full_name: string;
  phone: string;
  email: string | null;
  state_id: number;
  lga_id: number;
  town: string;

  // Reporting Information
  reporting_for: ReportingFor;
  beneficiary_name: string | null;
  relationship: string | null;

  // Case Details
  help_type: HelpType;
  description: string;

  // Consent
  info_confirmed: boolean;
  contact_consent: boolean;
  updates_consent: boolean;

  // Metadata
  user_id: string | null;
  status: CaseStatus;
  created_at: string;
  updated_at: string;

  // Joined data
  state_name?: string;
  lga_name?: string;
  files?: CaseFile[];
}

export interface CaseNote {
  id: string;
  case_id: string;
  note: string;
  admin_user_id: string;
  admin_name: string;
  created_at: string;
}

export interface CaseWithDetails extends Case {
  files: CaseFile[];
  notes?: CaseNote[];
  state_name: string;
  lga_name: string;
}
