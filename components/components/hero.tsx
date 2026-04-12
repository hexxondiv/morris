'use client';

import Link from 'next/link';
import Image from 'next/image';
import PulsingOnlineIndicator from './pulse-online-indicator';
import CTAButton from './cta-button';
import {
  useActiveVillagersFormatted,
  useIsLoading,
  useHasError,
  useAutoFetch,
  useTotalContributionsFormatted,
  useCashOnHandFormatted,
} from '@/app/stores/open-ledger-store';
import { ShimmerSkeleton } from './loading-skeletons';


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
  const totalContributions = useTotalContributionsFormatted();
  const cashOnHandFormatted = useCashOnHandFormatted();
  const loading = useIsLoading();
  const hasError = useHasError();

  // Determine if we should show error state
  const showError = hasError || (!activeVillagers && !loading);

  return (
    <section
      id="hero"
      role="banner"
      aria-labelledby="hero-title"
      className="container mx-auto px-6 py-10 sm:px-8 sm:py-16"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-14">
        <div className="space-y-8 text-center lg:text-left">
          <div className="inline-flex lg:block">
            <div className="relative inline-flex items-center justify-center space-x-1 rounded-full bg-green-100 px-4 py-2 text-sm font-medium">
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
                  <AnimatedNumber value={activeVillagers} suffix=" active villagers" />
                )}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hunter-green sm:text-sm">
              Aniocha North · Delta State · 2027
            </p>
            <h1
              id="hero-title"
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Morris Monye
            </h1>
            <p className="text-xl font-medium text-mud-800 sm:text-2xl">
              For Delta State House of Assembly
            </p>
            <p className="kw-text-body mx-auto max-w-xl text-lg text-stone-200 lg:mx-0">
              A community-backed platform for transparent support and impact—anchored in sincerity,
              integrity, competence, and capacity.
            </p>
          </div>

          <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-stone-100 bg-white/70 px-6 py-5 text-center shadow-sm backdrop-blur-sm lg:mx-0 lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hunter-green">
              Community fund
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-200">Cash on hand</p>
                <p className="text-2xl font-bold tracking-tight text-mud-900 sm:text-3xl">
                  {loading || cashOnHandFormatted === null ? (
                    <ShimmerSkeleton
                      width="w-32"
                      height="h-8"
                      className="inline-block"
                    />
                  ) : showError ? (
                    <span>$--</span>
                  ) : (
                    <AnimatedNumber value={cashOnHandFormatted} />
                  )}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs uppercase tracking-wide text-stone-200">Raised to date</p>
                <p className="text-lg font-semibold text-mud-800 sm:text-xl">
                  {loading || totalContributions === null ? (
                    <ShimmerSkeleton width="w-24" height="h-6" className="inline-block" />
                  ) : showError ? (
                    <span>$--</span>
                  ) : (
                    <AnimatedNumber value={totalContributions} />
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <CTAButton href="/dashboard">My Dashboard</CTAButton>
            <Link
              href="/#about-morris"
              className="font-medium text-mud-800 underline transition hover:text-mud-900"
            >
              Read about Morris
            </Link>
            <Link
              href="/about"
              className="font-medium text-mud-800 underline transition hover:text-mud-900"
            >
              How the platform works
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[400px]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-theme-200 shadow-xl">
            <Image
              src="/morris/m1.jpeg"
              alt="Morris Monye — campaign portrait"
              fill
              priority
              className="object-cover object-top"
              sizes="(min-width: 1024px) 400px, 90vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
