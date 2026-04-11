"use client";

import React from "react";
import { usePublicLedger } from "@/hooks/use-public-ledger";
import LogoLoader from "@/components/components/logo-loader";
import { ShimmerSkeleton } from "@/components/components/loading-skeletons";

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

const BalanceCard: React.FC<{ balance: number; loading?: boolean }> = ({
  balance,
  loading,
}) => {
  const isPositive = balance >= 0;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-theme-500 via-theme-600 to-theme-700 rounded-2xl p-8 shadow-2xl">
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
      <div className="relative z-10 text-center">
        <div className="inline-flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full mb-4">
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${
              isPositive ? "bg-lime" : "bg-coral-400"
            }`}
          ></div>
          <span className="text-sm font-medium text-white/90">
            Live Balance
          </span>
        </div>
        <div
          className={`text-5xl font-bold mb-2 ${
            isPositive ? "text-white" : "text-coral-400"
          }`}
        >
          {loading ? (
            <ShimmerSkeleton
              width="w-40 sm:w-48 lg:w-56"
              height="h-8 sm:h-10 lg:h-12"
              className="inline-block"
            />
          ) : (
            formatCurrency(balance, false)
          )}
        </div>
        <p className="text-white/80 text-sm">Updated in real-time</p>
      </div>
    </div>
  );
};

// Metric Cards
const MetricCard: React.FC<{
  label: string;
  value: number;
  type: "currency" | "count";
  color: "green" | "red" | "blue" | "gold";
  loading?: boolean;
}> = ({ label, value, type, color, loading }) => {
  const colorClasses = {
    green: "text-lime",
    red: "text-coral-600",
    blue: "text-theme-500",
    gold: "text-gold",
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/40 p-6 hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl">
      <p className="text-sm font-medium text-stone-200 mb-2">{label}</p>
      <div className={`text-base sm:text-3xl font-bold ${colorClasses[color]}`}>
        {loading ? (
          <ShimmerSkeleton
            width="w-28 sm:w-48 lg:w-56"
            height="h-8 sm:h-10 lg:h-12"
            className="inline-block"
          />
        ) : type === "currency" ? (
          formatCurrency(value, false)
        ) : (
          value.toLocaleString()
        )}
      </div>
    </div>
  );
};

export default function PublicLedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { metrics, loading } = usePublicLedger(10, "all");

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-p-light via-old-lace to-p-light">
        <div className="max-w-6xl mx-auto p-6">
          <LogoLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-p-light via-theme-100 to-theme-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-p-dark mb-4">
            Transparency Ledger
          </h1>
          <p className="text-lg text-stone-200 max-w-2xl mx-auto">
            Every transaction, every balance update - complete financial
            transparency in real-time.
          </p>
        </div>

        {/* Current Balance */}
        <BalanceCard balance={metrics.currentBalance} loading={loading} />

        {/* Key Metrics - Simplified Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Inflows"
            value={metrics.totalInflows}
            type="currency"
            color="green"
            loading={loading}
          />
          <MetricCard
            label="Total Outflows"
            value={metrics.totalOutflows}
            type="currency"
            color="red"
            loading={loading}
          />
          <MetricCard
            label="Net Flow"
            value={metrics.netFlow}
            type="currency"
            color="blue"
            loading={loading}
          />
          <MetricCard
            label="Transactions"
            value={metrics.transactionCount}
            type="count"
            color="gold"
            loading={loading}
          />
        </div>

        {/* Child content (transaction list or details) */}
        {children}
      </div>
    </div>
  );
}
