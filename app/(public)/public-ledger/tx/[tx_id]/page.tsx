"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Hash,
  FileText,
  AlertCircle,
  CheckCircle,
  Copy,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Info,
  Building2,
  Share2,
} from "lucide-react";
import { useTransactionDetails } from "@/hooks/use-transaction-details";
import LogoLoader from "@/components/components/logo-loader";
import { formatDateWithTime } from "@/lib/utils/date-time-formater";

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

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

const TransactionDetailsPage: React.FC = () => {
  const params = useParams();
  const tx_id = params?.tx_id as string;
  const { transaction, loading, error } = useTransactionDetails(tx_id);
  const [copied, setCopied] = React.useState(false);

  const shareTransaction = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LogoLoader />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 px-4">
          <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-coral-500 mx-auto mb-4 sm:mb-6" />
          <h3 className="text-lg sm:text-xl font-semibold text-p-dark mb-2 sm:mb-3">
            Transaction Not Found
          </h3>
          <p className="text-sm sm:text-base text-stone-200 mb-4 sm:mb-6">
            {error ||
              "The transaction you're looking for doesn't exist or has been removed."}
          </p>
          <Link
            href="/public-ledger"
            className="inline-flex items-center space-x-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-theme-500 text-white text-sm sm:text-base rounded-xl hover:bg-theme-600 transition-colors shadow-lg"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Back to Ledger</span>
          </Link>
        </div>
      </div>
    );
  }

  const isInflow = transaction.type === "inflow";
  const date = formatDateWithTime(transaction.date);

  return (
    <div className="space-y-6 sm:space-y-8 bg-slate-50 border border-stone-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-10">
      {/* Back Button */}
      <div className="pt-2 sm:pt-6 pb-2 sm:pb-4 flex items-center justify-between gap-3">
        <Link
          href="/public-ledger"
          className="inline-flex items-center space-x-2 sm:space-x-3 px-4 py-2.5 sm:px-8 sm:py-4 bg-theme-500 text-white text-sm sm:text-base rounded-xl sm:rounded-2xl hover:bg-theme-600 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Back to Ledger</span>
        </Link>
        
        <button
          onClick={shareTransaction}
          className="inline-flex items-center space-x-2 px-4 py-2.5 sm:px-6 sm:py-4 bg-white border-2 border-theme-500 text-theme-500 text-sm sm:text-base rounded-xl sm:rounded-2xl hover:bg-theme-50 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
          title="Share transaction"
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Share</span>
            </>
          )}
        </button>
      </div>

      {/* Hero Section - Transaction Type Badge & Title */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
          <div
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 ${
              isInflow
                ? "bg-lime shadow-lg"
                : "bg-coral-500 shadow-lg"
            }`}
          >
            {isInflow ? (
              <TrendingUp className="h-5 w-5 sm:h-8 sm:w-8 text-white" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="h-5 w-5 sm:h-8 sm:w-8 text-white" strokeWidth={2.5} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full whitespace-nowrap ${
                  isInflow
                    ? "bg-lime/10 text-lime border-2 border-lime/30"
                    : "bg-coral-500/10 text-coral-600 border-2 border-coral-500/30"
                }`}
              >
                {isInflow ? "Money In" : "Money Out"}
              </span>
              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-lime/10 text-lime border-2 border-lime/30 whitespace-nowrap">
                <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>{transaction.status}</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-p-dark break-words">
              {transaction.description}
            </h1>
          </div>
        </div>
      </div>

      {/* Amount Card - Featured */}
      <div
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 shadow-2xl ${
          isInflow
            ? "bg-lime"
            : "bg-coral-500"
        }`}
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            {isInflow ? (
              <ArrowDownLeft className="h-4 w-4 sm:h-6 sm:w-6 text-white/90" />
            ) : (
              <ArrowUpRight className="h-4 w-4 sm:h-6 sm:w-6 text-white/90" />
            )}
            <p className="text-white/90 text-sm sm:text-lg font-semibold">Transaction Amount</p>
          </div>

          <div className="space-y-4 sm:space-y-0 sm:flex sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <div className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-1 sm:mb-2 break-words">
                {formatCurrency(transaction.amount)}
              </div>
              <p className="text-white/80 text-xs sm:text-sm font-medium">
                {transaction.category}
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Resulting Balance
              </p>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white break-words">
                {formatCurrency(transaction.running_balance, false)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Date & Time */}
        <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-stone-100 p-4 sm:p-6 hover:border-theme-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-theme-50">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-theme-500" />
            </div>
            <h3 className="font-bold text-p-dark text-sm sm:text-base">Date & Time</h3>
          </div>
          <p className="text-p-dark text-base sm:text-lg font-semibold break-words">{date}</p>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-stone-100 p-4 sm:p-6 hover:border-theme-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-theme-50">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-theme-500" />
            </div>
            <h3 className="font-bold text-p-dark text-sm sm:text-base">Payment Method</h3>
          </div>
          <p className="text-p-dark text-base sm:text-lg font-semibold uppercase break-words">
            {transaction.payment_method}
          </p>
        </div>

        {/* Category/Project */}
        {transaction.subcategory && transaction.subcategory !== "General" && (
          <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-stone-100 p-4 sm:p-6 hover:border-theme-200 hover:shadow-lg transition-all duration-300 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-theme-50">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-theme-500" />
              </div>
              <h3 className="font-bold text-p-dark text-sm sm:text-base">
                {isInflow ? "Designated Fund" : "Category"}
              </h3>
            </div>
            <p className="text-p-dark text-base sm:text-lg font-semibold break-words">
              {transaction.subcategory}
            </p>
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-stone-100 p-4 sm:p-6 lg:p-8 hover:border-theme-200 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-theme-50">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-theme-500" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-p-dark">Transaction Details</h3>
        </div>
        <p className="text-stone-200 text-sm sm:text-base leading-relaxed break-words">
          {transaction.items}
        </p>
      </div>

      {/* Reference & ID Section */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Reference */}
        {transaction.reference && (
          <div className="bg-stone-50 rounded-xl sm:rounded-2xl border-2 border-stone-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white">
                <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-theme-500" />
              </div>
              <h3 className="font-bold text-p-dark text-sm sm:text-base">Payment Reference</h3>
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-stone-200 gap-2">
              <code className="text-xs sm:text-sm font-mono text-p-dark font-semibold truncate flex-1 min-w-0">
                {transaction.reference}
              </code>
              <button
                onClick={() => copyToClipboard(transaction.reference)}
                className="flex-shrink-0 p-1.5 sm:p-2 hover:bg-theme-50 rounded-lg transition-colors group"
                title="Copy reference"
              >
                <Copy className="h-4 w-4 text-stone-200 group-hover:text-theme-500" />
              </button>
            </div>
          </div>
        )}

        {/* Transaction ID */}
        <div className="bg-stone-50 rounded-xl sm:rounded-2xl border-2 border-stone-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white">
              <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-theme-500" />
            </div>
            <h3 className="font-bold text-p-dark text-sm sm:text-base">Transaction ID</h3>
          </div>
          <div className="flex items-center justify-between bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-stone-200 gap-2">
            <code className="text-xs font-mono text-p-dark font-semibold truncate flex-1 min-w-0">
              {transaction.id}
            </code>
            <button
              onClick={() => copyToClipboard(transaction.id)}
              className="flex-shrink-0 p-1.5 sm:p-2 hover:bg-theme-50 rounded-lg transition-colors group"
              title="Copy transaction ID"
            >
              <Copy className="h-4 w-4 text-stone-200 group-hover:text-theme-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Transparency Notice */}
      <div className="bg-theme-50 rounded-xl sm:rounded-2xl border-2 border-theme-200 p-4 sm:p-6 lg:p-8">
        <div className="flex items-start space-x-3 sm:space-x-4">
          <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-theme-500 flex-shrink-0">
            <Info className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-p-dark mb-1.5 sm:mb-2 text-base sm:text-lg">
              Verified & Transparent
            </h4>
            <p className="text-stone-200 text-sm sm:text-base leading-relaxed break-words">
              This transaction has been verified and permanently recorded in our
              public ledger for complete financial transparency. All completed
              transactions are immutable and publicly accessible to ensure
              accountability.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="pt-2 sm:pt-6 pb-2 sm:pb-4">
        <Link
          href="/public-ledger"
          className="inline-flex items-center space-x-2 sm:space-x-3 px-4 py-2.5 sm:px-8 sm:py-4 bg-theme-500 text-white text-sm sm:text-base rounded-xl sm:rounded-2xl hover:bg-theme-600 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold w-full sm:w-auto justify-center"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>View All Transactions</span>
        </Link>
      </div>
    </div>
  );
};

export default TransactionDetailsPage;