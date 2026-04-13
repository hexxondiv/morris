"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  AlertCircle,
  Heart,
} from "lucide-react";
import { formatDateSmart } from "@/lib/utils/date-time-formater";
import { LedgerFilterType, PublicLedgerEntry, TopDonor } from "@/types/public-ledger";

type PublicLedgerResponse = {
  entries: PublicLedgerEntry[];
  topDonors: TopDonor[];
  metrics: {
    currentBalance: number;
    totalInflows: number;
    totalOutflows: number;
    netFlow: number;
    transactionCount: number;
  };
  hasMore?: boolean;
};

const formatCurrency = (amount: number, showSign: boolean = true): string => {
  const formatted = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  if (!showSign) return formatted;
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
};

const Skeleton: React.FC<{ width?: string; height?: string }> = ({
  width = "100%",
  height = "1em",
}) => (
  <div
    className="animate-pulse bg-gray-300 rounded"
    style={{
      width,
      height,
      minWidth: width === "100%" ? undefined : width,
      minHeight: height,
    }}
  />
);

const TransactionEntry: React.FC<{
  entry: PublicLedgerEntry;
  loading?: boolean;
}> = ({ entry, loading }) => {
  const date = formatDateSmart(entry.date);
  const isInflow = entry.type === "inflow";

  return (
    <Link href={`/public-ledger/tx/${entry.id}`}>
      <div className="group bg-white/90 backdrop-blur-sm border border-white/50 rounded-xl p-4 sm:p-5 hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div
              className={`w-4 h-4 rounded-full flex-shrink-0 ${
                isInflow ? "bg-lime" : "bg-coral-500"
              } shadow-lg`}
            ></div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-p-dark text-sm sm:text-lg truncate">
                  {entry.description}
                </h4>
                <div className="flex items-center space-x-3 text-right">
                  <div
                    className={`font-bold text-sm whitespace-nowrap sm:text-xl ${
                      isInflow ? "text-lime" : "text-coral-600"
                    }`}
                  >
                    {loading ? (
                      <Skeleton width="8ch" height="1.5rem" />
                    ) : (
                      formatCurrency(entry.amount)
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-3">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ${
                      isInflow
                        ? "bg-lime/10 text-lime border border-lime/20"
                        : "bg-coral-500/10 text-coral-600 border border-coral-500/20"
                    }`}
                  >
                    {entry.category}
                  </span>
                  <span className="text-xs text-stone-200">{date}</span>
                </div>

                <div className="text-xs text-stone-200 text-right">
                  Balance:{" "}
                  <span className="font-medium text-p-dark">
                    {loading ? (
                      <Skeleton width="8ch" height="1rem" />
                    ) : (
                      formatCurrency(entry.running_balance, false)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

const TopDonorsCard: React.FC<{ topDonors: TopDonor[]; loading?: boolean }> = ({
  topDonors,
  loading,
}) => {
  return (
    <div className="bg-gradient-to-br from-theme-600 via-theme-700 to-theme-800 rounded-2xl p-4 sm:p-8 shadow-2xl">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center space-x-2 bg-white bg-opacity-20 px-3 sm:px-4 py-2 rounded-full mb-4">
          <Heart className="w-4 h-4 text-white opacity-90" />
          <span className="text-sm font-medium text-white opacity-90">
            Top Contributors
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Our Champions</h3>
        <p className="text-white opacity-80 text-sm">
          Recognizing our most generous supporters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        <div className="space-y-2 sm:space-y-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white bg-opacity-10 rounded-lg"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white bg-opacity-20 rounded-full animate-pulse flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="w-24 sm:w-32 h-3 sm:h-4 bg-white bg-opacity-20 rounded animate-pulse mb-1 sm:mb-2"></div>
                    <div className="w-16 sm:w-24 h-2 sm:h-3 bg-white bg-opacity-20 rounded animate-pulse"></div>
                  </div>
                  <div className="w-16 sm:w-20 h-3 sm:h-4 bg-white bg-opacity-20 rounded animate-pulse flex-shrink-0"></div>
                </div>
              ))
            : topDonors.slice(0, 5).map((donor, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-300"
                >
                  <div className="flex-shrink-0">
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                        index === 0
                          ? "bg-gold text-p-dark"
                          : index === 1
                            ? "bg-stone-100 text-p-dark"
                            : index === 2
                              ? "bg-p-yellow text-p-dark"
                              : "bg-white bg-opacity-20 text-white opacity-70"
                      }`}
                    >
                      {index + 1}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-white truncate text-sm sm:text-base">
                        {donor.name}
                      </h4>
                      {donor.is_anonymous && (
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white opacity-50 flex-shrink-0"></div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4 text-xs text-white opacity-70">
                      <span>{donor.donation_count} donations</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">
                        Since {formatDateSmart(donor.first_donation)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-white text-xs sm:text-sm">
                      {formatCurrency(donor.total_amount, false)}
                    </div>
                    <div className="text-xs text-white opacity-70 hidden sm:block">
                      Last: {formatDateSmart(donor.last_donation)}
                    </div>
                  </div>
                </div>
              ))}
        </div>

        <div className="space-y-2 sm:space-y-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i + 5}
                  className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white bg-opacity-10 rounded-lg"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white bg-opacity-20 rounded-full animate-pulse flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="w-24 sm:w-32 h-3 sm:h-4 bg-white bg-opacity-20 rounded animate-pulse mb-1 sm:mb-2"></div>
                    <div className="w-16 sm:w-24 h-2 sm:h-3 bg-white bg-opacity-20 rounded animate-pulse"></div>
                  </div>
                  <div className="w-16 sm:w-20 h-3 sm:h-4 bg-white bg-opacity-20 rounded animate-pulse flex-shrink-0"></div>
                </div>
              ))
            : topDonors.slice(5, 10).map((donor, index) => (
                <div
                  key={index + 5}
                  className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-300"
                >
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                      <span className="text-white opacity-70 font-bold text-xs sm:text-sm">
                        {index + 6}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-white truncate text-sm sm:text-base">
                        {donor.name}
                      </h4>
                      {donor.is_anonymous && (
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white opacity-50 flex-shrink-0"></div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4 text-xs text-white opacity-70">
                      <span>{donor.donation_count} donations</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">
                        Since {formatDateSmart(donor.first_donation)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-white text-xs sm:text-sm">
                      {formatCurrency(donor.total_amount, false)}
                    </div>
                    <div className="text-xs text-white opacity-70 hidden sm:block">
                      Last: {formatDateSmart(donor.last_donation)}
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

const FilterButtons: React.FC<{
  activeFilter: LedgerFilterType;
  onFilterChange: (filter: LedgerFilterType) => void;
  entries: PublicLedgerEntry[];
}> = ({ activeFilter, onFilterChange, entries }) => {
  const counts = {
    all: entries.length,
    inflows: entries.filter((e) => e.type === "inflow").length,
    outflows: entries.filter((e) => e.type === "outflow").length,
  };

  return (
    <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-xl border border-white/40 p-1 shadow-lg">
      <button
        onClick={() => onFilterChange("all")}
        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          activeFilter === "all"
            ? "bg-theme-500 text-white shadow-lg"
            : "text-stone-200 hover:text-p-dark hover:bg-white/50"
        }`}
      >
        All ({counts.all})
      </button>
      <button
        onClick={() => onFilterChange("inflow")}
        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
          activeFilter === "inflow"
            ? "bg-lime text-white shadow-lg"
            : "text-stone-200 hover:text-p-dark hover:bg-white/50"
        }`}
      >
        <ArrowDownLeft className="h-4 w-4" />
        <span>In ({counts.inflows})</span>
      </button>
      <button
        onClick={() => onFilterChange("outflow")}
        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
          activeFilter === "outflow"
            ? "bg-coral-500 text-white shadow-lg"
            : "text-stone-200 hover:text-p-dark hover:bg-white/50"
        }`}
      >
        <ArrowUpRight className="h-4 w-4" />
        <span>Out ({counts.outflows})</span>
      </button>
    </div>
  );
};

const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({
  error,
  onRetry,
}) => (
  <div className="text-center py-16">
    <AlertCircle className="h-16 w-16 text-coral-500 mx-auto mb-6" />
    <h3 className="text-xl font-semibold text-p-dark mb-3">Unable to Load Data</h3>
    <p className="text-stone-200 mb-6">{error}</p>
    <button
      onClick={onRetry}
      className="px-6 py-3 bg-theme-500 text-white rounded-xl hover:bg-theme-600 transition-colors shadow-lg"
    >
      Try Again
    </button>
  </div>
);

type PublicLedgerClientProps = {
  initialData: PublicLedgerResponse;
  initialLimit: number;
};

export default function PublicLedgerClient({
  initialData,
  initialLimit,
}: PublicLedgerClientProps) {
  const [filterType, setFilterType] = useState<LedgerFilterType>("all");
  const [limit, setLimit] = useState(initialLimit);
  const [entries, setEntries] = useState<PublicLedgerEntry[]>(initialData.entries);
  const [topDonors, setTopDonors] = useState<TopDonor[]>(initialData.topDonors);
  const [hasMore, setHasMore] = useState(Boolean(initialData.hasMore));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (nextLimit: number, nextFilter: LedgerFilterType) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        limit: String(nextLimit),
        filter: nextFilter,
      });
      const response = await fetch(`/api/public-ledger?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const result = (await response.json()) as PublicLedgerResponse;
      setEntries(result.entries || []);
      setTopDonors(result.topDonors || []);
      setHasMore(Boolean(result.hasMore));
      setLimit(nextLimit);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = useCallback(
    (nextFilter: LedgerFilterType) => {
      setFilterType(nextFilter);
      void fetchData(initialLimit, nextFilter);
    },
    [fetchData, initialLimit]
  );

  const handleRefresh = useCallback(() => {
    void fetchData(limit, filterType);
  }, [fetchData, filterType, limit]);

  const handleLoadMore = useCallback(() => {
    void fetchData(limit + initialLimit, filterType);
  }, [fetchData, filterType, initialLimit, limit]);

  if (error) {
    return <ErrorState error={error} onRetry={handleRefresh} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-8">
        <TopDonorsCard topDonors={topDonors} loading={loading} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold text-p-dark">Recent Activity</h2>
          <button
            onClick={handleRefresh}
            className="p-2.5 text-stone-200 hover:text-p-dark hover:bg-white/50 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <FilterButtons
          activeFilter={filterType}
          onFilterChange={handleFilterChange}
          entries={entries}
        />
      </div>

      {entries.length === 0 && !loading ? (
        <div className="text-center py-16">
          <Calendar className="h-16 w-16 text-stone-200 mx-auto mb-6" />
          <p className="text-stone-200 text-lg">No transactions match your filter.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col space-y-4">
            {entries.map((entry) => (
              <TransactionEntry key={entry.id} entry={entry} loading={loading} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-3 bg-theme-500 text-white rounded-xl hover:bg-theme-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
