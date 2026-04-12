"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import DonateButton from "@/components/components/donate-button";
import left from "../../../images/book_left.png";
import right from "../../../images/book_right.png";
import { formatCurrency } from "@/lib/utils";
import { VoteButton } from "@/components/components/vote-button";
import { toast } from "sonner";
import SocialShareButtons from "@/components/share-button";
import { fadeIn, fadeInUp, staggerContainer, scaleIn, slideInFromLeft, slideInFromRight } from "@/lib/animations";
import { FAQ } from "@/components/components/faq-section";
import { useSetting } from "@/hooks/use-settings";

type ActiveProjectPreview = {
  id: string;
  title: string;
  slug: string;
  goal_amount: number;
  current_amount: number;
};

const AboutUs: React.FC = () => {
  const [activeProject, setActiveProject] = useState<ActiveProjectPreview | null>(
    null
  );
  const [activeProjectLoading, setActiveProjectLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "1",
          statuses: "active",
          paginate: "true",
          sortBy: "updated_at",
          sortOrder: "desc",
        });
        const res = await fetch(`/api/projects?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load projects");
        const json = (await res.json()) as {
          data?: Record<string, unknown>[];
        };
        const first = json.data?.[0];
        if (
          first &&
          typeof first.title === "string" &&
          typeof first.slug === "string" &&
          typeof first.id === "string"
        ) {
          const goal = Number(first.goal_amount);
          const current = Number(first.current_amount ?? 0);
          if (!cancelled) {
            setActiveProject({
              id: first.id,
              title: first.title,
              slug: first.slug,
              goal_amount: Number.isFinite(goal) ? goal : 0,
              current_amount: Number.isFinite(current) ? current : 0,
            });
          }
        } else if (!cancelled) {
          setActiveProject(null);
        }
      } catch {
        if (!cancelled) setActiveProject(null);
      } finally {
        if (!cancelled) setActiveProjectLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const FootstepDecoration: React.FC = () => (
    <motion.section
      className="flex justify-center"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeIn}
    >
      <div className="opacity-60">
        {[...Array(3)].map((_, i: number) => (
          <motion.div
            key={i}
            className="grid grid-cols-2 gap-4 py-2"
            variants={fadeInUp}
            transition={{ delay: i * 0.1 }}
          >
            <div key={`l-${i}`} className="mt-8 text-right h-14 w-9">
              <Image
                src={left}
                width={60}
                height={100}
                alt="footstep"
                className="object-cover inline-block"
              />
            </div>
            <div key={`r-${i}`} className="text-left h-14 w-9">
              <Image
                src={right}
                width={60}
                height={100}
                alt="footstep"
                className="object-cover"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );

  const PLEDGE_MINIMUM_AMOUNT = useSetting('minimum_pledge_amount');

  return (
    <main className="p-4 overflow-x-hidden">
      <div className="text-theme-900">
        {/* Hero Section */}
        <motion.section
          className="min-h-[300px]"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <div className="mx-auto mt-6 max-w-3xl py-12 md:mt-10 md:py-16">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold px-4 text-center leading-snug lg:leading-tight"
              variants={fadeInUp}
              transition={{ delay: 0.2 }}
            >
              MORRIS brings people at home and in the diaspora together to fund
              practical development in Aniocha North, Delta State—where
              transparent giving meets local priorities.
            </motion.h1>
          </div>
        </motion.section>

        <FootstepDecoration />

        {/* How MORRIS works */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <div className="mx-auto max-w-2xl py-24">
            <p className="text-4xl md:text-5xl font-bold px-4 text-center">
              How MORRIS works
            </p>
          </div>
        </motion.section>

        <FootstepDecoration />

        {/* Self-sustaining Section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <div className="mx-auto max-w-2xl py-24 text-center">
            <div className="space-y-10">
              <motion.div
                className="inline-block bg-theme-100 text-theme-800 px-5 py-3 text-lg rounded-full font-medium"
                variants={scaleIn}
              >
                Self-sustaining
              </motion.div>
              <motion.p
                className="text-4xl md:text-5xl font-bold px-4"
                variants={fadeInUp}
              >
                Join us by making a monthly pledge of at least{" "}
                {formatCurrency(PLEDGE_MINIMUM_AMOUNT ?? 5000)}. That contribution
                backs vetted projects in Aniocha North and grants you voting
                rights on how funds move.
              </motion.p>
              <motion.div
                className="bg-white rounded-2xl shadow-lg p-6 mx-auto max-w-xl border border-theme-100"
                variants={slideInFromLeft}
              >
                <div className="flex items-center space-x-5">
                  <div className="h-12 w-12 rounded-lg bg-theme-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">O</span>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-medium text-theme-900">Onoh</p>
                    <p className="font-medium text-theme-700">
                      Welcome aboard—you now have voting rights on Aniocha North
                      funding decisions.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <FootstepDecoration />

        {/* Trackable Impact Section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <div className="mx-auto max-w-2xl py-24 text-center">
            <div className="space-y-10">
              <motion.div
                className="inline-block bg-theme-100 text-theme-800 px-5 py-3 text-lg rounded-full font-medium"
                variants={scaleIn}
              >
                Trackable impact
              </motion.div>
              <motion.p
                className="text-4xl md:text-5xl font-bold px-4"
                variants={fadeInUp}
              >
                Follow Monye&apos;s projects from pledge to delivery with
                updates you can trace in the open ledger.
              </motion.p>
              <motion.div
                className="bg-white rounded-2xl shadow-lg p-6 mx-auto max-w-lg border border-theme-100"
                variants={slideInFromRight}
              >
                {activeProjectLoading ? (
                  <div className="space-y-4 text-left animate-pulse">
                    <div className="h-8 w-32 rounded-full bg-theme-100" />
                    <div className="h-7 w-full max-w-md rounded bg-theme-100" />
                    <div className="h-4 w-48 rounded bg-theme-50" />
                    <div className="h-2 w-full overflow-hidden bg-theme-50 rounded-full">
                      <div className="h-2 w-1/3 rounded-full bg-theme-200" />
                    </div>
                    <div className="h-10 w-32 rounded-lg bg-theme-100" />
                  </div>
                ) : activeProject ? (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-2 bg-white/30 w-fit backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-theme-100">
                      <div className="rounded-full bg-lime w-2 h-2 animate-pulse" />
                      <span className="text-sm font-medium text-theme-900">
                        Active
                      </span>
                    </div>
                    <div className="text-xl font-medium text-theme-900">
                      {activeProject.title}
                    </div>
                    <div>
                      <div className="text-theme-700 block mb-4 text-sm">
                        {formatCurrency(activeProject.current_amount)} raised of{" "}
                        {formatCurrency(activeProject.goal_amount)} goal
                      </div>
                      <div className="h-2 w-full overflow-hidden bg-theme-50 rounded-full mb-2">
                        <motion.div
                          className="h-2 rounded-full bg-gradient-to-r from-theme-500 to-theme-600 transition-all duration-700 ease-in-out"
                          initial={{ width: 0 }}
                          whileInView={{
                            width: `${
                              activeProject.goal_amount > 0
                                ? Math.min(
                                    100,
                                    (activeProject.current_amount /
                                      activeProject.goal_amount) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                          transition={{ duration: 1.2, delay: 0.5 }}
                        />
                      </div>
                    </div>
                    <Link
                      href={`/projects/${activeProject.slug}`}
                      className="inline-flex bg-theme-100 hover:bg-theme-200 text-theme-800 px-4 py-2 rounded-lg transition-colors"
                    >
                      View project
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4 text-center sm:text-left">
                    <div className="flex items-center gap-2 bg-theme-50 w-fit mx-auto sm:mx-0 rounded-full px-4 py-2 border border-theme-100">
                      <span className="text-sm font-medium text-theme-700">
                        No active project
                      </span>
                    </div>
                    <p className="text-theme-700 text-sm leading-relaxed">
                      There isn&apos;t an active project to highlight right now.
                      Browse all projects to see what&apos;s live or coming up.
                    </p>
                    <Link
                      href="/projects"
                      className="inline-flex bg-theme-100 hover:bg-theme-200 text-theme-800 px-4 py-2 rounded-lg transition-colors"
                    >
                      Browse projects
                    </Link>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.section>

        <FootstepDecoration />

        {/* Joint Decision Making */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <div className="mx-auto max-w-2xl py-24 text-center">
            <div className="space-y-10">
              <motion.div
                className="inline-block bg-theme-100 text-theme-800 px-5 py-3 text-lg rounded-full font-medium"
                variants={scaleIn}
              >
                Joint decision making
              </motion.div>
              <motion.p
                className="text-4xl md:text-5xl font-bold px-4 md:leading-normal"
                variants={fadeInUp}
              >
                Voting sessions decide major releases from the fund. Members who
                give at least one qualifying donation help steer impact where it
                counts—in Aniocha North communities.
              </motion.p>
              <motion.div
                className="bg-white rounded-2xl shadow-lg p-6 mx-auto max-w-lg border border-theme-100"
                variants={slideInFromLeft}
              >
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 bg-white/30 w-fit backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-theme-100">
                      <div className="rounded-full bg-gold w-2 h-2 animate-pulse" />
                      <span className="text-sm font-medium text-theme-900">
                        Voting
                      </span>
                    </div>
                  <div className="text-xl font-medium">
                    We&apos;ve drafted a proposal to use{" "}
                    {formatCurrency(13500000)} from our fund to stand up an
                    artisan training space in Aniocha North, Delta State.
                  </div>
                  <VoteButton
                    projectId=""
                    hasVoted={false}
                    currentVote={null}
                    canVote={true}
                    startDate="2025-07-25T00:00:00Z"
                    endDate="2025-08-10T23:59:59Z"
                    optimisticUpdate={() => {
                      toast.info('Successfully tried demo voting!')
                    }}
                    revertUpdate={() => {
                      toast.info('Successfully opposed demo voting!')
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <FootstepDecoration />

        {/* Financial Transparency */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <div className="mx-auto max-w-2xl py-24 text-center">
            <div className="space-y-10">
              <motion.div
                className="inline-block bg-theme-100 text-theme-800 px-5 py-3 text-lg rounded-full font-medium"
                variants={scaleIn}
              >
                Financial transparency
              </motion.div>
              <motion.p
                className="text-4xl md:text-5xl font-bold px-4"
                variants={fadeInUp}
              >
                Every naira committed to Aniocha North work is accounted for in a
                public ledger you can inspect.
              </motion.p>
              <motion.div
                className="bg-white rounded-2xl shadow-lg mx-auto max-w-3xl text-left border border-theme-100 overflow-hidden"
                variants={slideInFromRight}
              >
                <div className="divide-y divide-dashed divide-theme-200">
                  {[
                    {
                      label: "Funding to Aniocha North youth skills workshop",
                      amount: 3109000,
                      color: "text-coral-500",
                      sign: "-"
                    },
                    {
                      label: "Payment processing fees",
                      amount: 52000,
                      color: "text-coral-500",
                      sign: "-"
                    },
                    {
                      label: "Member contributions (Aniocha North fund)",
                      amount: 64562.0,
                      color: "text-lime",
                      sign: "+"
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      className="flex justify-between items-center px-6 py-7"
                      variants={fadeInUp}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div>
                        <span className="block font-medium text-lg text-theme-900">
                          {item.label}
                        </span>
                      </div>
                      <span className={`text-xl font-medium ${item.color}`}>
                        {item.sign}{formatCurrency(item.amount)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <FootstepDecoration />

        {/* Call to Action */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <div className="mx-auto max-w-2xl py-24 text-center">
            <div className="space-y-10">
              <motion.p
                className="text-4xl md:text-5xl font-bold"
                variants={fadeInUp}
              >
                We are widening the circle of people who care about Aniocha
                North—near and far—and putting collective philanthropy to work on
                the priorities residents set together.
              </motion.p>
              <motion.div className="space-y-6" variants={staggerContainer}>
                <motion.div variants={slideInFromLeft}>
                  <Link
                    href="/dashboard"
                    className="bg-theme-500 hover:bg-theme-600 text-white mx-auto flex w-full max-w-xs items-center justify-center rounded-lg px-6 py-3 transition-colors"
                  >
                    My dashboard
                  </Link>
                </motion.div>
                <motion.span
                  className="block text-lg font-medium"
                  variants={fadeIn}
                >
                  Or
                </motion.span>
                <motion.div variants={slideInFromRight}>
                  <a
                    href="/pledge"
                    target="_blank"
                    className="bg-theme-100 hover:bg-theme-200 text-theme-800 mx-auto block w-full max-w-xs rounded-lg text-center px-6 py-3 transition-colors"
                  >
                    Make a one-time gift
                  </a>
                </motion.div>
                <motion.div variants={scaleIn}>
                  <SocialShareButtons />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <FootstepDecoration />

        {/* FAQ Section */}
        <FAQ />
      </div>

      {/* Fixed Bottom CTA */}
      <motion.div
        className="hidden md:block fixed bottom-0 left-0 z-50 w-full bg-gradient-to-t from-theme-200 via-theme-50 p-8 pt-32 text-center md:p-16 md:pt-40"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        <div className="mx-auto w-full max-w-[280px] sm:max-w-[320px]">
          <DonateButton size="lg" />
        </div>
      </motion.div>
    </main>
  );
};

export default AboutUs;
