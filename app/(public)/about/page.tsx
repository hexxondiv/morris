"use client";

import React, { useRef } from "react";
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
import TeamCarousel from "@/components/components/team-carousel";
import { useSetting } from "@/hooks/use-settings";

// Type definitions
interface TeamMember {
  name: string;
  role: string;
  image: string;
  linkedin: string;
}

const AboutUs: React.FC = () => {
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
          <div className="mx-auto mt-6 max-w-3xl py-24 md:mt-12">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold px-4 text-center"
              variants={fadeInUp}
              transition={{ delay: 0.2 }}
            >
              <span className="leading-[100px">
                MORRIS MONYE brings both Nigerians and the diaspora together to fund impactful development across South-Eastern Nigeria.
              </span>
            </motion.h1>
          </div>
        </motion.section>

        <FootstepDecoration />

{/* Team Section */}
        <TeamCarousel />
        <FootstepDecoration />

        {/* How MORRIS MONYE Works */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <div className="mx-auto max-w-2xl py-24">
            <p className="text-4xl md:text-5xl font-bold px-4 text-center">
              How MORRIS MONYE works
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
                {formatCurrency(PLEDGE_MINIMUM_AMOUNT ?? 5000)}. This contribution funds projects and
                grants you voting rights.
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
                      Welcome to the village. You now have voting rights.
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
                Members can track project progress and get real-time updates
                from the field.
              </motion.p>
              <motion.div
                className="bg-white rounded-2xl shadow-lg p-6 mx-auto max-w-lg border border-theme-100"
                variants={slideInFromRight}
              >
                <div className="space-y-4 text-left">
                    <div className="flex items-center gap-2 bg-white/30 w-fit backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-theme-100">
                      <div className="rounded-full bg-lime w-2 h-2 animate-pulse" />
                      <span className="text-sm font-medium text-theme-900">
                        In Progress
                      </span>
                    </div>
                  <div className="text-xl font-medium">
                    Renovating a state library in Onitsha
                  </div>
                  <div>
                    <div className="text-theme-700 block mb-4">est. 4 month completion</div>
                    <div className="h-2 w-full overflow-hidden bg-theme-50 rounded-full mb-2">
                      <motion.div
                        className="h-2 rounded-full bg-gradient-to-r from-theme-500 to-theme-600 transition-all duration-700 ease-in-out"
                        initial={{ width: 0 }}
                        whileInView={{ width: "65%" }}
                        transition={{ duration: 1.2, delay: 0.5 }}
                      />
                    </div>
                  </div>
                  <button className="bg-theme-100 hover:bg-theme-200 text-theme-800 px-4 py-2 rounded-lg transition-colors">
                    View project
                  </button>
                </div>
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
               Voting sessions are held to approve key funding decisions. Members gain voting rights with at least one kind donation, inviting all to shape our impact.
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
                    We've drafted a proposal to use {formatCurrency(13500000)} from our fund to
                    build an artisan school in 🇳🇬 Abakiliki, Nigeria.
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
                All finances and every transaction are accounted for in a public
                ledger.
              </motion.p>
              <motion.div
                className="bg-white rounded-2xl shadow-lg mx-auto max-w-3xl text-left border border-theme-100 overflow-hidden"
                variants={slideInFromRight}
              >
                <div className="divide-y divide-dashed divide-theme-200">
                  {[
                    {
                      label: "Funding to Stem Anambra Workshop",
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
                      label: "Villager contributions",
                      amount: 64562.00,
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
                We plan to build a global community of people and tap into
                the enormous power of collective philanthropy.
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
