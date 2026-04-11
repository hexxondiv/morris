export interface Transaction {
  id: string;
  pledge_id: string | null;
  user_id: string;
  user_email?: string;
  user_name?: string;
  project_id?: string | null;
  chart_id: string;
  chart_name?: string | null;
  chart_public_name?: string | null;
  project_title?: string | null;
  project_timeline_id?: string | null;
  project_timeline_title?: string | null;
  payment_type: "pledge" | "donation" | "deployment" | "expense" | "refund";
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_status: "pending" | "completed" | "failed" | "refunded" | "cancelled";
  description?: string;
  payment_ref: string | null;
  metadata: Record<string, any> | null;
  paid_at: string;
  created_at: string;
  updated_at: string;
  category: string | null;
  running_balance?: number;
}