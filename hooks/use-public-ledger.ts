import {
  PublicLedgerEntry,
  LedgerMetrics,
  LedgerFilterType,
  LedgerData,
} from "@/types/public-ledger";
import { useState, useEffect, useCallback, useRef } from "react";

const POLL_MS = 60_000;

export const usePublicLedger = (
  limit: number = 10,
  filterType: LedgerFilterType = "all"
) => {
  const [data, setData] = useState<LedgerData>({
    entries: [],
    metrics: {
      currentBalance: 0,
      totalInflows: 0,
      totalOutflows: 0,
      netFlow: 0,
      transactionCount: 0,
    },
    topDonors: [],
    hasMore: false,
    loading: true,
    error: null,
  });

  const mounted = useRef(true);

  const fetchLedgerData = useCallback(async (): Promise<void> => {
    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      const qs = new URLSearchParams({
        limit: String(limit),
        filter: filterType,
      });
      const res = await fetch(`/api/public-ledger?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const result = await res.json();

      const entries: PublicLedgerEntry[] = (result?.entries || []).map(
        (entry: Record<string, unknown>) => ({
          ...entry,
          amount: Number(entry.amount),
          running_balance: Number(entry.running_balance),
        })
      );

      const metrics: LedgerMetrics = {
        currentBalance: Number(result?.metrics?.currentBalance || 0),
        totalInflows: Number(result?.metrics?.totalInflows || 0),
        totalOutflows: Number(result?.metrics?.totalOutflows || 0),
        netFlow: Number(result?.metrics?.netFlow || 0),
        transactionCount: Number(result?.metrics?.transactionCount || 0),
      };

      const topDonors = result?.topDonors;
      const hasMore = Boolean(result?.hasMore);

      if (!mounted.current) return;
      setData({
        entries,
        metrics,
        topDonors,
        hasMore,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching ledger data:", error);
      if (!mounted.current) return;
      setData((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to load ledger data",
      }));
    }
  }, [limit, filterType]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    void fetchLedgerData();
  }, [fetchLedgerData]);

  useEffect(() => {
    const id = setInterval(() => {
      void fetchLedgerData();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [fetchLedgerData]);

  return {
    ...data,
    refetch: fetchLedgerData,
  };
};
