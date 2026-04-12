// components/OpenLedger.tsx
"use client";

import Link from "next/link";
import React from "react";
import PulsingOnlineIndicator from "./pulse-online-indicator";
import CTAButton from "./cta-button";
import {
  useActiveVillagersFormatted,
  useCashDeployedFormatted,
  useIsLoading,
  useHasError,
  useAutoFetch,
  useMonthlyContributionsFormatted,
  useCashOnHandFormatted,
  useMonthlyFixedCostsFormatted,
} from "@/app/stores/open-ledger-store";

const ShimmerSkeleton = ({
  width = "w-32",
  height = "h-6",
  className = "",
  rounded = "rounded-md",
}: {
  width?: string;
  height?: string;
  className?: string;
  rounded?: string;
}) => (
  <span
    className={`${width} ${height} ${rounded} ${className} relative inline-block overflow-hidden bg-gray-200 align-middle`}
    aria-hidden="true"
  >
    <span className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </span>
);

const AnimatedNumber = ({
  value,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}) => (
  <span
    className={`inline-block transition-all duration-500 ease-in-out ${className}`}
  >
    {prefix}
    {value}
    {suffix}
  </span>
);

export default function OpenLedger() {
  const activeVillagers = useActiveVillagersFormatted();
  const cashDeployedFormatted = useCashDeployedFormatted();
  const monthlyContributions = useMonthlyContributionsFormatted();
  const cashOnHand = useCashOnHandFormatted();
  const monthlyFixedCosts = useMonthlyFixedCostsFormatted();
  const loading = useIsLoading();
  const hasError = useHasError();

  // Determine if we should show error state
  const showError = hasError || (!activeVillagers && !loading);

  const metrics = [
    {
      icon: "🫴🏾",
      label: "Monthly contributions",
      value: loading ? null : showError ? "--" : monthlyContributions,
    },
    {
      icon: "💵",
      label: "Cash on hand",
      value: loading ? null : showError ? "--" : cashOnHand,
    },
    {
      icon: "💸",
      label: "Monthly fixed costs",
      value: loading ? null : showError ? "--" : monthlyFixedCosts,
    },
    {
      icon: "🌍",
      label: "Cash deployed",
      value: loading ? null : showError ? "--" : cashDeployedFormatted,
    },
  ];

  return (
    <section className="bg-theme-50 pb-8 pt-16 sm:pb-12 sm:pt-24">
      <div id="metrics" className="container px-6 sm:px-4 mx-auto">
        <div className="space-y-6 text-center">
          <h2 className="section-header text-center mb-8">Open ledger</h2>
          <Link href="/public-ledger" className="button-secondary">
            View transactions
          </Link>
        </div>

        <div className="mx-auto mt-12 mb-12 max-w-lg sm:mb-16 sm:max-w-3xl">
          <ul className="divide-y divide-mud-300/50 card-no-padding overflow-hidden bg-white shadow-sm rounded-xl">
            <li className="flex justify-between bg-theme-50 px-7 py-5">
              <span className="text-lg font-medium text-mud-900">
                Open Data
              </span>
            </li>

            {/* Active villagers with loading state */}
            <li className="flex justify-between hover:bg-mud-50/25 px-5 sm:px-7 py-4 sm:py-5 transition-colors duration-300">
              <div className="text-size-lg font-medium text-mud-800 relative flex items-center">
                <PulsingOnlineIndicator size={20} />
                <span className="pl-7">Active villagers</span>
              </div>
              <div className="sm:pl-8 sm:border-l border-mud-300 text-size-lg font-medium text-mud-900">
                {loading ? (
                  <ShimmerSkeleton
                    width="w-16"
                    height="h-6"
                    className="inline-block"
                    rounded="rounded"
                  />
                ) : showError ? (
                  "--"
                ) : (
                  <AnimatedNumber value={activeVillagers} />
                )}
              </div>
            </li>

            {/* Dynamic metrics with loading states */}
            {metrics.map((metric, idx) => (
              <li
                key={idx}
                className="flex justify-between hover:bg-mud-50/25 px-5 sm:px-7 py-4 sm:py-5 transition-colors duration-300"
              >
                <div className="text-size-lg font-medium text-mud-800 relative">
                  {metric.icon}&nbsp; <span>{metric.label}</span>
                </div>
                <div className="sm:pl-8 sm:border-l border-mud-300 text-size-lg font-medium text-mud-900">
                  {loading ? (
                    <ShimmerSkeleton
                      width="w-20"
                      height="h-6"
                      className="inline-block"
                      rounded="rounded"
                    />
                  ) : (
                    <AnimatedNumber value={metric.value || "--"} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-12 mb-8 block space-y-9 text-center px-2">
          <div className="block text-center text-size-lg font-medium text-mud-800">
            Join a community of{" "}
            {loading ? (
              <ShimmerSkeleton
                width="w-12"
                height="h-6"
                className="inline-block mx-1"
                rounded="rounded"
              />
            ) : showError ? (
              "--"
            ) : (
              <AnimatedNumber value={activeVillagers} />
            )}{" "}
            changemakers
          </div>
          <CTAButton href="/dashboard">Get started</CTAButton>
          <div className="block text-center text-size-lg font-medium text-mud-800">
            Already a member?{" "}
            <Link
              href="/sign-in"
              className="font-medium underline underline-offset-1"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
