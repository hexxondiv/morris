export interface PublicLedgerEntry {
  id: string;
  date: string;
  type: 'inflow' | 'outflow';
  description: string;
  amount: number;
  category: string;
  subcategory: string;
  reference: string;
  items: string;
  status: string;
  payment_method: string;
  running_balance: number;
}

export interface LedgerMetrics {
  currentBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netFlow: number;
  transactionCount: number;
}

export interface LedgerData {
  entries: PublicLedgerEntry[];
  metrics: LedgerMetrics;
  topDonors: TopDonor[];
  hasMore?: boolean;
  loading: boolean;
  error: string | null;
}

export interface TopDonor {
  name: string;
  total_amount: number;
  donation_count: number;
  is_anonymous: boolean;
  first_donation: string;
  last_donation: string;
}

export type LedgerFilterType = 'all' | 'inflow' | 'outflow';