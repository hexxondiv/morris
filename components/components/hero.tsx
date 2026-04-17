'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Wallet, TrendingUp } from 'lucide-react';
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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.06 },
  },
};

const AnimatedNumber = ({
  value,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}) => (
  <span className={`inline-block transition-all duration-500 ease-in-out ${className}`}>
    {prefix}
    {value}
    {suffix}
  </span>
);

const Hero = () => {
  useAutoFetch();
  const activeVillagers = useActiveVillagersFormatted();
  const totalContributions = useTotalContributionsFormatted();
  const cashOnHandFormatted = useCashOnHandFormatted();
  const loading = useIsLoading();
  const hasError = useHasError();
  const showError = hasError || (!activeVillagers && !loading);

  return (
    <section
      id="hero"
      role="banner"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden pt-6 pb-16 sm:pt-10 sm:pb-20 lg:pb-24"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-theme-100/40 via-[#FAFAFA] to-[#FAFAFA]" />
        <div className="absolute -top-32 right-[-15%] h-[min(560px,90vw)] w-[min(560px,90vw)] rounded-full bg-theme-400/25 blur-[100px] sm:right-[-5%]" />
        <div className="absolute top-1/2 left-[-25%] h-[min(380px,75vw)] w-[min(380px,75vw)] -translate-y-1/2 rounded-full bg-theme-500/10 blur-[90px] sm:left-[-8%]" />
        <div className="absolute bottom-[-10%] right-[10%] h-[min(320px,60vw)] w-[min(320px,60vw)] rounded-full bg-gold-metallic/20 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(9 63 133 / 0.07) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-theme-300/40 to-transparent" />
      </div>

      <div className="container relative mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-16"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <div className="space-y-9 text-center lg:col-span-7 lg:text-left">
            <motion.div variants={fadeUp} className="flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-theme-200/80 bg-white/70 px-4 py-2 text-sm font-medium text-theme-800 shadow-sm backdrop-blur-md">
                <PulsingOnlineIndicator />
                <span className="flex items-center gap-1.5">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <ShimmerSkeleton
                        width="w-8"
                        height="h-4"
                        className="inline-block"
                        rounded="rounded"
                      />
                      <span className="text-theme-700/90">Active supporters</span>
                    </span>
                  ) : showError ? (
                    <span className="text-theme-700/90">-- Active supporters</span>
                  ) : (
                    <AnimatedNumber
                      value={activeVillagers}
                      suffix=" Active supporters"
                      className="text-theme-900"
                    />
                  )}
                </span>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-theme-600 sm:text-sm">
                Aniocha North · Delta State · 2027
              </p>
              <h1
                id="hero-title"
                className="font-league text-4xl font-bold tracking-tight text-theme-900 sm:text-5xl lg:text-[3.25rem] xl:text-6xl xl:leading-[1.08]"
              >
                <span className="block bg-gradient-to-br from-theme-900 via-theme-700 to-theme-600 bg-clip-text text-transparent">
                  Morris Monye
                </span>
              </h1>
              <p className="text-xl font-semibold text-theme-800 sm:text-2xl sm:font-medium">
                For Delta State House of Assembly
              </p>
              <p className="mx-auto max-w-xl text-lg leading-relaxed text-slate-600 lg:mx-0">
                A community-backed platform for transparent support and impact—anchored in sincerity,
                integrity, competence, and capacity.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mx-auto w-full max-w-lg rounded-2xl border border-white/80 bg-white/75 p-6 shadow-[0_20px_50px_-24px_rgb(9_63_133/0.18)] backdrop-blur-md lg:mx-0"
            >
              <p className="mb-5 text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-theme-600 lg:text-left">
                Community fund
              </p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-0">
                <div className="flex gap-4 sm:border-r sm:border-theme-100 sm:pr-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-500/10 text-theme-700">
                    <Wallet className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Cash on hand
                    </p>
                    <p className="mt-0.5 text-2xl font-bold tracking-tight text-theme-900 sm:text-3xl">
                      {loading || cashOnHandFormatted === null ? (
                        <ShimmerSkeleton width="w-32" height="h-8" className="inline-block" />
                      ) : showError ? (
                        <span>$--</span>
                      ) : (
                        <AnimatedNumber value={cashOnHandFormatted} />
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 sm:pl-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-metallic/15 text-theme-800">
                    <TrendingUp className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Raised to date
                    </p>
                    <p className="mt-0.5 text-xl font-semibold tracking-tight text-theme-800 sm:text-2xl">
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
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex flex-col items-stretch gap-3 sm:mx-auto sm:max-w-xl sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:mx-0 lg:max-w-none lg:justify-start"
            >
              <CTAButton href="/dashboard" className="!max-w-none sm:w-auto sm:min-w-[200px]">
                <span className="inline-flex items-center justify-center gap-2">
                  My Dashboard
                  <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
                </span>
              </CTAButton>
              <Link
                href="/#about-morris"
                className="inline-flex h-12 items-center justify-center rounded-full border border-theme-200/90 bg-white/90 px-6 text-sm font-semibold text-theme-800 shadow-sm transition hover:border-theme-300 hover:bg-white hover:shadow-md"
              >
                Read about Morris
              </Link>
              <Link
                href="/about"
                className="inline-flex h-12 items-center justify-center rounded-full text-sm font-semibold text-theme-700 underline-offset-4 transition hover:text-theme-900 hover:underline"
              >
                How the platform works
              </Link>
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            className="relative mx-auto w-full max-w-[min(420px,100%)] lg:col-span-5"
          >
            <div
              className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-theme-300/60 via-white to-gold-metallic/30 opacity-90 blur-sm"
              aria-hidden
            />
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/90 bg-white shadow-[0_32px_64px_-20px_rgb(9_63_133/0.35)] ring-1 ring-theme-900/5">
              <Image
                src="/morris/m1.jpeg"
                alt="Morris Monye — campaign portrait"
                fill
                priority
                className="object-cover object-top"
                sizes="(min-width: 1024px) 420px, 90vw"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-theme-900/30 via-transparent to-theme-500/5"
                aria-hidden
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
