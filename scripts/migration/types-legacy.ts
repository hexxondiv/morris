/** Narrow legacy row shapes (Supabase / Postgres) used by the migration tooling. */

export type LegacyProfile = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LegacyProject = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  goal_amount: number | string;
  current_amount?: number | string | null;
  status: string;
  cover_image?: string | null;
  state?: string | null;
  country?: string | null;
  sector?: string | null;
  slug: string;
  body_html?: string | null;
  created_at: string;
  updated_at: string;
};

export type LegacyPledge = {
  id: string;
  user_id: string;
  project_id?: string | null;
  amount: number | string;
  pledge_type: string;
  recurrence_interval?: string | null;
  payment_day?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LegacyTransaction = {
  id: string;
  pledge_id?: string | null;
  user_id: string;
  payment_type: string;
  amount: number | string;
  currency?: string | null;
  payment_method?: string | null;
  payment_status: string;
  payment_ref?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  paid_at?: string | null;
};

export type LegacyVote = {
  id: string;
  user_id: string;
  project_id: string;
  vote: boolean;
  created_at?: string | null;
};

export type LegacyVotingPeriod = {
  id: string;
  project_id: string;
  start_date: string;
  end_date: string;
  created_at?: string | null;
};

export type LegacySetting = {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
};

export type ClerkExportUser = {
  id: string;
  primary_email_address?: string | null;
  email_addresses?: Array<{ email_address?: string }>;
};
