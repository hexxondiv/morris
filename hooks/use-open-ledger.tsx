// "use client"
// import { useState, useEffect, useCallback } from 'react';

// interface OpenLedgerMetrics {
//   active_villagers: number;
//   monthly_contributions: number;
//   cash_on_hand: number;
//   monthly_fixed_costs: number;
//   cash_deployed: number;
//   general_fund: number;
//   project_specific_fund: number;
//   one_time_total: number;
//   recurring_total: number;
//   last_updated: string;
//   currency: string;
//   success: boolean;
//   formatted: {
//     active_villagers: string;
//     monthly_contributions: string;
//     cash_on_hand: string;
//     monthly_fixed_costs: string;
//     cash_deployed: string;
//     general_fund: string;
//     project_specific_fund: string;
//     one_time_total: string;
//     recurring_total: string;
//   };
// }

// interface ApiErrorResponse {
//   error: boolean;
//   success: false;
//   message: string;
//   details?: string;
// }

// interface UseOpenLedgerReturn {
//   metrics: OpenLedgerMetrics | null;
//   loading: boolean;
//   error: string | null;
//   refetch: () => Promise<void>;
// }

// export function useOpenLedger(
//   autoRefresh = false, 
//   refreshInterval = 5 * 60 * 1000
// ): UseOpenLedgerReturn {
//   const [metrics, setMetrics] = useState<OpenLedgerMetrics | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const fetchMetrics = useCallback(async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       // Fixed path to match your API route
//       const response = await fetch('/api/open-ledger-metrics', {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         // Add cache control for better performance
//         cache: 'no-store',
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data: OpenLedgerMetrics | ApiErrorResponse = await response.json();

//       // Type-safe error checking
//       if ('error' in data && data.error) {
//         throw new Error(data.message || 'Failed to fetch open ledger metrics');
//       }

//       // Type assertion since we know it's successful
//       setMetrics(data as OpenLedgerMetrics);
//     } catch (err) {
//       console.error('Error fetching open ledger metrics:', err);
//       setError(err instanceof Error ? err.message : 'Unknown error occurred');
//       setMetrics(null);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchMetrics();
//   }, [fetchMetrics]);

//   // Auto-refresh functionality
//   useEffect(() => {
//     if (!autoRefresh) return;

//     const interval = setInterval(() => {
//       fetchMetrics();
//     }, refreshInterval);

//     return () => clearInterval(interval);
//   }, [autoRefresh, refreshInterval, fetchMetrics]);

//   return {
//     metrics,
//     loading,
//     error,
//     refetch: fetchMetrics,
//   };
// }