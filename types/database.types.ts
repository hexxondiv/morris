// lib/types.ts
export interface Profile {
  id: string; // Clerk user ID (UUID)
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Cause {
  id: string; // UUID
  creator_id: string; // Clerk user ID (UUID)
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'proposed' | 'voting';
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Pledge {
  id: string; // UUID
  user_id: string; // Clerk user ID (UUID)
  cause_id: string; // UUID
  amount: number;
  pledge_type: 'one_time' | 'recurring';
  recurrence_interval: 'monthly' | 'quarterly' | 'yearly' | null;
  status: 'pending' | 'active' | 'cancelled';
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Transaction {
  id: string; // UUID
  pledge_id: string; // UUID
  user_id: string; // Clerk user ID (UUID)
  amount: number;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_processor_id: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Event {
  id: string; // UUID
  cause_id: string; // UUID
  title: string;
  description: string;
  event_date: string; // ISO timestamp
  location: string | null;
  event_type: 'meeting' | 'fundraiser' | 'update' | 'other';
  recording_url: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Vote {
  id: string; // UUID
  user_id: string; // Clerk user ID (UUID)
  cause_id: string; // UUID
  vote_value: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export type Role = "admin" | "moderator" | "editor" | "user";
