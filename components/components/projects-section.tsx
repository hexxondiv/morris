"use client";

import Metrics from "./metrics";
import Link from "next/link";
import { useHasError, useRecentProjects } from "@/app/stores/open-ledger-store";
import { ProjectsGrid } from "./project-grid";

export default function ProjectsSection() {
  const recentProjects = useRecentProjects();
  // const loading = useIsLoading();
  const hasError = useHasError();
  return (
    <section
      id="projects"
      className="px-6 sm:px-12 py-16 bg-gradient-to-br from-p-light via-white to-theme-50"
    >
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-theme-500 rounded-full mb-6">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-p-dark mb-4">
            Our <span className="text-theme-500">Projects</span>
          </h2>
          <p className="text-xl text-stone-200 max-w-2xl mx-auto mb-8">
            Discover practical projects funded for Aniocha North, Delta
            State—schools, livelihoods, and community assets your support can
            move forward.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-8 py-4 bg-theme-500 hover:bg-theme-600 text-white font-medium rounded-xl transition-all hover:scale-105 shadow-lg"
          >
            View All Projects
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>

        {/* Projects Grid */}
        <ProjectsGrid projects={recentProjects} />

        {/* Metrics Section */}
        <div className="mt-16">
          <Metrics
            message="Trust. Transparency. Results"
            buttonInfo={{ href: "/sign-in", text: "Join the campaign" }}
          />
        </div>
      </div>
    </section>
  );
}
