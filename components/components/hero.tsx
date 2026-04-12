'use client';

import Link from 'next/link';
import React from 'react';
import PulsingOnlineIndicator from './pulse-online-indicator';
import CTAButton from './cta-button';
import { 
  useActiveVillagersFormatted,
  useCashDeployedFormatted,
  useCashDeployedAmount,
  useIsLoading,
  useHasError,
  useAutoFetch,
  useTotalContributionsFormatted,
  useRecentProjects,
  useCashOnHandFormatted
} from '@/app/stores/open-ledger-store';
import { ShimmerSkeleton } from './loading-skeletons';
import { formatCurrency } from '@/lib/utils';


const AnimatedNumber = ({ 
  value, 
  prefix = "", 
  suffix = "",
  className = "" 
}: { 
  value: string; 
  prefix?: string; 
  suffix?: string;
  className?: string;
}) => (
  <span className={`inline-block transition-all duration-500 ease-in-out ${className}`}>
    {prefix}{value}{suffix}
  </span>
);

const Hero = () => {
  useAutoFetch();
  // Individual selectors - no SSR issues, optimal performance
  const activeVillagers = useActiveVillagersFormatted();
  const cashDeployedFormatted = useCashDeployedFormatted();
  const cashDeployedAmount = useCashDeployedAmount();
  const totalContributions = useTotalContributionsFormatted();
  const cashOnHandFormatted = useCashOnHandFormatted(); // Assuming this is the same as cash deployed for now
  const recentProjectsCount = useRecentProjects()?.length
  const loading = useIsLoading();
  const hasError = useHasError();

  // Calculate lives improved
  const livesImproved = React.useMemo(() => {
    return cashDeployedAmount ? Math.floor(cashDeployedAmount / 180.9) : 0;
  }, [cashDeployedAmount]);

  // Determine if we should show error state
  const showError = hasError || (!activeVillagers && !loading);

  return (
    <section
      id="hero"
      role="banner"
      aria-labelledby="hero-title"
      className="container space-y-8 px-8 mx-auto py-8 text-center sm:py-16 relative"
    >
      <div className="mx-auto max-w-2xl space-y-6 lg:pt-2 relative">
        {/* Badge */}
        <div className="block">
          <div className="relative inline-flex items-center justify-center space-x-1 px-4 py-2 rounded-full bg-green-100 font-medium text-sm">
            <PulsingOnlineIndicator />
            <span className="flex items-center space-x-1 text-green">
              {loading ? (
                <span className="inline-flex items-center space-x-1">
                  <ShimmerSkeleton
                    width="w-8"
                    height="h-4"
                    className="inline-block"
                    rounded="rounded"
                  />
                  <span>active villagers</span>
                </span>
              ) : showError ? (
                <span>-- active villagers</span>
              ) : (
                <AnimatedNumber 
                  value={activeVillagers} 
                  suffix=" active villagers" 
                />
              )}
            </span>
          </div>
        </div>

        {/* Title with Dynamic Data */}
        <div className="pt-4">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-hunter-green font-semibold">
              Cash on Hand
            </p>
            <h1 id="hero-title" className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              {loading || cashOnHandFormatted === null ? (
                <ShimmerSkeleton width="w-40 sm:w-48 lg:w-56" height="h-10 sm:h-12 lg:h-14" className="inline-block" />
              ) : showError ? (
                <span>$--</span>
              ) : (
                <AnimatedNumber value={cashOnHandFormatted} />
              )}
            </h1>
          </div>

          <div className="w-12 mx-auto border-t border-stone-100 my-4" />

          <div className="space-y-1">
            <p className="text-lg sm:text-xl lg:text-2xl font-normal text-stone-200">
              {loading || totalContributions === null ? (
                <ShimmerSkeleton width="w-28 sm:w-32 lg:w-36" height="h-6 sm:h-7 lg:h-8" className="inline-block" />
              ) : showError ? (
                <span>$--</span>
              ) : (
                <AnimatedNumber value={totalContributions} />
              )}
            </p>
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-stone-200 font-normal">
              raised to date
            </p>
          </div>

          <p className="kw-text-body text-lg text-stone-200 pb-2 mt-6">
            Funding sustainable educational development across South-Eastern Nigeria.
          </p>
        </div>

        <CTAButton href='/dashboard'>My Dashboard</CTAButton>

        <div className="pt-3 block">
          <Link
            href="/about"
            className="font-medium text-lg underline text-mud-800 hover:text-mud-900 transition"
          >
            Learn how MORRIS MONYE works
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
