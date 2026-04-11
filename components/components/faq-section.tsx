"use client";

import Metrics from "./metrics";
import { useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, fadeInUp, slideInFromLeft } from "@/lib/animations";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Who's behind MORRIS MONYE?",
    answer:
      "MORRIS MONYE is led by a dedicated team of professionals committed to social impact and transparency.",
  },
  {
    question: "How can I learn more about your governance and legal structure?",
    answer:
      "You can find detailed information on our governance page or request official documents via our contact form.",
  },
  {
    question: "Is MORRIS MONYE a registered charity?",
    answer:
      "Yes, MORRIS MONYE is registered and operates as a legal entity under relevant charitable regulations.",
  },
  {
    question: "How does MORRIS MONYE select and vet project partners?",
    answer:
      "We use a rigorous selection process that includes background checks, past work assessments, and alignment with our mission.",
  },
  {
    question: "How does MORRIS MONYE ensure transparent fund and project management?",
    answer:
      "We publish regular reports, use third-party audits, and provide member access to financial breakdowns.",
  },
];

export default function FAQSection() {
  return (
    <section className="pb-8 pt-16 sm:pb-12 sm:pt-24">
      <div id="metrics" className="container px-6 sm:px-4 mx-auto">
        <FAQ />

        <Metrics
          message="Trust. Transparency. Results"
          buttonInfo={{ href: "/signin", text: "Join the village" }}
        />
      </div>
    </section>
  );
}

export function FAQ() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number): void => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={staggerContainer}
      id="faqs"
    >
      <div className="mx-auto max-w-3xl space-y-10 py-24 pb-32 md:pb-48">
        <motion.p
          className="text-4xl md:text-5xl font-bold px-4 text-center"
          variants={fadeInUp}
        >
          Frequently asked questions
        </motion.p>
        <motion.div
          className="mx-auto mt-12 mb-12 max-w-md sm:mb-16 sm:max-w-3xl space-y-4"
          variants={staggerContainer}
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-2xl shadow-lg border border-theme-100"
              variants={slideInFromLeft}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => toggleFaq(index)}
                className="flex w-full items-start justify-between text-left p-6 hover:bg-theme-50 transition-colors rounded-2xl"
                aria-expanded={openFaq === index}
              >
                <span className="text-lg font-medium text-theme-900 lg:text-xl leading-relaxed pr-4">
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openFaq === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="h-5 w-5 text-theme-500 flex-shrink-0" />
                </motion.div>
              </button>
              <motion.div
                initial={false}
                animate={{
                  height: openFaq === index ? "auto" : 0,
                  opacity: openFaq === index ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="px-6 pb-6 pt-2 sm:pt-4">
                  <p className="text-theme-700">{faq.answer}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
