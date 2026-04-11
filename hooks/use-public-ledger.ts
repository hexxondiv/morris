import { supabase } from "@/lib/supabase";
import { PublicLedgerEntry, LedgerMetrics, LedgerFilterType, LedgerData } from "@/types/public-ledger";
import { useState, useEffect } from "react";

export const usePublicLedger = (
  limit: number = 10,
  filterType: LedgerFilterType = 'all'
) => {
  const [data, setData] = useState<LedgerData>({
    entries: [],
    metrics: {
      currentBalance: 0,
      totalInflows: 0,
      totalOutflows: 0,
      netFlow: 0,
      transactionCount: 0
    },
    topDonors: [],
    loading: true,
    error: null
  });

const fetchLedgerData = async (): Promise<void> => {
  try {
    setData(prev => ({ ...prev, loading: true, error: null }));

    const { data: result, error: entriesError } = await supabase.rpc(
      'get_public_ledger',
      {
        entry_limit: limit,
        entry_offset: 0,
        filter_type: filterType
      }
    );

    if (entriesError) throw new Error(entriesError.message);

    // Data structure now perfectly matches your TypeScript interfaces!
    const entries: PublicLedgerEntry[] = (result?.entries || []).map((entry: any) => ({
      ...entry,
      amount: Number(entry.amount),
      running_balance: Number(entry.running_balance)
    }));

    const metrics: LedgerMetrics = {
      currentBalance: Number(result?.metrics?.currentBalance || 0),
      totalInflows: Number(result?.metrics?.totalInflows || 0),
      totalOutflows: Number(result?.metrics?.totalOutflows || 0),
      netFlow: Number(result?.metrics?.netFlow || 0),
      transactionCount: Number(result?.metrics?.transactionCount || 0)
    };

    const topDonors = result?.topDonors;

    setData({
      entries,
      metrics,
      topDonors,
      loading: false,
      error: null
    });

  } catch (error) {
    console.error('Error fetching ledger data:', error);
    setData(prev => ({
      ...prev,
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to load ledger data'
    }));
  }
};

  useEffect(() => {
    fetchLedgerData();
  }, [limit, filterType]);

  useEffect(() => {
    const channel = supabase
      .channel('public-ledger-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: 'payment_status=eq.completed'
        },
        (payload) => {
          console.log('New transaction:', payload);
          fetchLedgerData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  //   const testChannel = supabase
  // .channel('test-connection')
  // .on('presence', { event: 'sync' }, () => console.log('✅ Connected to Supabase real-time'))
  // .subscribe();
  }, []);

  return {
    ...data,
    refetch: fetchLedgerData
  };
};
