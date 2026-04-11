import { formatCurrency } from "@/lib/utils";
import { RecentProjectSummary } from "@/types/project";
import React from "react";
import { create } from "zustand";

export interface OpenLedgerMetrics {
  active_villagers: number;
  monthly_contributions: number;
  cash_on_hand: number;
  monthly_operational_costs: number;
  cash_deployed: number;
  general_fund: number;
  project_specific_fund: number;
  one_time_total: number;
  recurring_total: number;
  recent_projects: RecentProjectSummary[];
  total_contributions: number;
  last_updated: string;
  currency: string;
  success: boolean;
  formatted: {
    active_villagers: string;
    monthly_contributions: string;
    cash_on_hand: string;
    monthly_operational_costs: string;
    cash_deployed: string;
    general_fund: string;
    project_specific_fund: string;
    one_time_total: string;
    recurring_total: string;
  };
}

interface OpenLedgerStore {
  // State
  metrics: OpenLedgerMetrics | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // Actions
  setMetrics: (metrics: OpenLedgerMetrics) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchMetrics: () => Promise<void>;
  refetch: () => Promise<void>;
  clearData: () => void;
}

export const useOpenLedgerStore = create<OpenLedgerStore>((set, get) => ({
  // Initial state
  metrics: null,
  loading: false,
  error: null,
  lastFetch: null,

  // Actions
  setMetrics: (metrics) => set({ metrics, lastFetch: Date.now() }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Main fetch function
  fetchMetrics: async () => {
    try {
      set({ loading: true, error: null });

      const response = await fetch("/api/open-ledger-metrics", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Failed to fetch open ledger metrics");
      }

      set({
        metrics: data,
        loading: false,
        error: null,
        lastFetch: Date.now(),
      });
    } catch (err) {
      console.error("Error fetching open ledger metrics:", err);
      set({
        error: err instanceof Error ? err.message : "Unknown error occurred",
        loading: false,
      });
    }
  },

  // Refetch function
  refetch: async () => {
    await get().fetchMetrics();
  },

  // Clear data
  clearData: () =>
    set({
      metrics: null,
      loading: false,
      error: null,
      lastFetch: null,
    }),
}));

// ===================================
// INDIVIDUAL PRIMITIVE SELECTORS (NO SSR ISSUES)
// ===================================

// Base state selectors
export const useIsLoading = () => useOpenLedgerStore((state) => state.loading);
export const useStoreError = () => useOpenLedgerStore((state) => state.error);
export const useLastFetch = () =>
  useOpenLedgerStore((state) => state.lastFetch);
export const useMetrics = () => useOpenLedgerStore((state) => state.metrics);

// Active Villagers selectors
export const useActiveVillagersCount = () =>
  useOpenLedgerStore((state) => state.metrics?.active_villagers || 0);

export const useActiveVillagersFormatted = () =>
  useOpenLedgerStore(
    (state) => state.metrics?.formatted.active_villagers || "0"
  );

// Cash Deployed selectors
export const useCashDeployedAmount = () =>
  useOpenLedgerStore((state) => state.metrics?.cash_deployed || 0);

export const useCashDeployedFormatted = () =>
  useOpenLedgerStore(
    (state) => state.metrics?.formatted.cash_deployed || formatCurrency(0)
  );


export const useTotalContributionsFormatted = () => 
  useOpenLedgerStore((state) => {
    if (!state.metrics?.total_contributions) {
      return null; // Return null when no data is available
    }
    return formatCurrency(state.metrics.total_contributions);
  });

// Cash on Hand selectors
export const useCashOnHandAmount = () =>
  useOpenLedgerStore((state) => state.metrics?.cash_on_hand || 0);

export const useCashOnHandFormatted = () =>
  useOpenLedgerStore(
    (state) => state.metrics?.formatted.cash_on_hand || formatCurrency(0)
  );

// Monthly Contributions selectors
export const useMonthlyContributionsAmount = () =>
  useOpenLedgerStore((state) => state.metrics?.monthly_contributions || 0);

export const useMonthlyContributionsFormatted = () =>
  useOpenLedgerStore(
    (state) =>
      state.metrics?.formatted.monthly_contributions || formatCurrency(0)
  );

// Monthly Fixed Costs selectors
export const useMonthlyFixedCostsAmount = () =>
  useOpenLedgerStore(
    (state) => state.metrics?.monthly_operational_costs || formatCurrency(0)
  );

export const useMonthlyFixedCostsFormatted = () =>
  useOpenLedgerStore(
    (state) =>
      state.metrics?.formatted.monthly_operational_costs || formatCurrency(0)
  );

// General Fund selectors
export const useGeneralFundAmount = () =>
  useOpenLedgerStore((state) => state.metrics?.general_fund || 0);

export const useGeneralFundFormatted = () =>
  useOpenLedgerStore(
    (state) => state.metrics?.formatted.general_fund || formatCurrency(0)
  );

// Project Specific Fund selectors
export const useProjectSpecificFundAmount = () =>
  useOpenLedgerStore((state) => state.metrics?.project_specific_fund || 0);

export const useProjectSpecificFundFormatted = () =>
  useOpenLedgerStore(
    (state) =>
      state.metrics?.formatted.project_specific_fund || formatCurrency(0)
  );

// One Time Total selectors
export const useOneTimeTotalAmount = () =>
  useOpenLedgerStore((state) => state.metrics?.one_time_total || 0);

export const useOneTimeTotalFormatted = () =>
  useOpenLedgerStore(
    (state) => state.metrics?.formatted.one_time_total || formatCurrency(0)
  );

// Recurring Total selectors
export const useRecurringTotalAmount = () =>
  useOpenLedgerStore((state) => state.metrics?.recurring_total || 0);

export const useRecurringTotalFormatted = () =>
  useOpenLedgerStore(
    (state) => state.metrics?.formatted.recurring_total || formatCurrency(0)
  );

// Metadata selectors
export const useLastUpdated = () =>
  useOpenLedgerStore((state) => state.metrics?.last_updated || null);

export const useCurrency = () =>
  useOpenLedgerStore((state) => state.metrics?.currency || "NGN");

const EMPTY_PROJECTS_ARRAY: any[] = [];

export const useRecentProjects = () =>
  useOpenLedgerStore(
    (state) => state.metrics?.recent_projects ?? EMPTY_PROJECTS_ARRAY
  );

export const useSuccess = () =>
  useOpenLedgerStore((state) => state.metrics?.success || false);

// ===================================
// ACTION HOOKS
// ===================================

export const useFetchMetrics = () =>
  useOpenLedgerStore((state) => state.fetchMetrics);

export const useRefetchMetrics = () =>
  useOpenLedgerStore((state) => state.refetch);

export const useClearData = () =>
  useOpenLedgerStore((state) => state.clearData);

export const useSetLoading = () =>
  useOpenLedgerStore((state) => state.setLoading);

export const useSetError = () => useOpenLedgerStore((state) => state.setError);

// ===================================
// CONVENIENCE HOOKS
// ===================================

// Check if data exists
export const useHasData = () => useOpenLedgerStore((state) => !!state.metrics);

// Check if data is stale (older than 5 minutes)
export const useIsDataStale = () => {
  const lastFetch = useLastFetch();

  return React.useMemo(() => {
    if (!lastFetch) return true;
    return Date.now() - lastFetch > 5 * 60 * 1000; // 5 minutes
  }, [lastFetch]);
};

// Auto-fetch data when component mounts
export const useAutoFetch = () => {
  const fetchMetrics = useFetchMetrics();
  const hasData = useHasData();
  const loading = useIsLoading();

  React.useEffect(() => {
    if (!hasData && !loading) {
      fetchMetrics();
    }
  }, [hasData, loading, fetchMetrics]);
};

// Combined loading state for multiple values
export const useLoadingAny = () => {
  const loading = useIsLoading();
  const hasData = useHasData();

  return loading || !hasData;
};

// Combined error checking
export const useHasError = () => {
  const error = useStoreError();
  return !!error;
};

// ===================================
// BULK SELECTORS (for when you need multiple values)
// ===================================

// Get all formatted financial values at once
export const useAllFormattedFinancials = () => {
  const cashOnHand = useCashOnHandFormatted();
  const cashDeployed = useCashDeployedFormatted();
  const monthlyContributions = useMonthlyContributionsFormatted();
  const monthlyFixedCosts = useMonthlyFixedCostsFormatted();
  const generalFund = useGeneralFundFormatted();
  const projectSpecificFund = useProjectSpecificFundFormatted();
  const oneTimeTotal = useOneTimeTotalFormatted();
  const recurringTotal = useRecurringTotalFormatted();

  return React.useMemo(
    () => ({
      cashOnHand,
      cashDeployed,
      monthlyContributions,
      monthlyFixedCosts,
      generalFund,
      projectSpecificFund,
      oneTimeTotal,
      recurringTotal,
    }),
    [
      cashOnHand,
      cashDeployed,
      monthlyContributions,
      monthlyFixedCosts,
      generalFund,
      projectSpecificFund,
      oneTimeTotal,
      recurringTotal,
    ]
  );
};

// Get all amount values at once
export const useAllAmountFinancials = () => {
  const cashOnHand = useCashOnHandAmount();
  const cashDeployed = useCashDeployedAmount();
  const monthlyContributions = useMonthlyContributionsAmount();
  const monthlyFixedCosts = useMonthlyFixedCostsAmount();
  const generalFund = useGeneralFundAmount();
  const projectSpecificFund = useProjectSpecificFundAmount();
  const oneTimeTotal = useOneTimeTotalAmount();
  const recurringTotal = useRecurringTotalAmount();

  return React.useMemo(
    () => ({
      cashOnHand,
      cashDeployed,
      monthlyContributions,
      monthlyFixedCosts,
      generalFund,
      projectSpecificFund,
      oneTimeTotal,
      recurringTotal,
    }),
    [
      cashOnHand,
      cashDeployed,
      monthlyContributions,
      monthlyFixedCosts,
      generalFund,
      projectSpecificFund,
      oneTimeTotal,
      recurringTotal,
    ]
  );
};
