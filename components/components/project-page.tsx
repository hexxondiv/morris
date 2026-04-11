"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ProjectsGrid } from "@/components/components/project-grid";
import { projectSchema, ProjectSchema } from "@/lib/zod-schema";
import { Loader2, Search, Filter, Grid, List, Plus } from "lucide-react";
import { toast } from "sonner";
import { debounce } from "lodash";
import LogoLoader from "./logo-loader";

interface ProjectsPageProps {
  initialStatuses?: string[];
  isAdminView?: boolean;
  title?: string;
  subtitle?: string;
  allowStatusFilter?: boolean;
  allowSearch?: boolean;
  allowViewModeToggle?: boolean;
  pageSize?: number;
}

export default function ProjectsPage({
  initialStatuses = ["proposed", "voting", "active", "completed"],
  isAdminView = false,
  title = "Discover Projects",
  subtitle = "Explore innovative projects making a difference in communities across Nigeria",
  allowStatusFilter = true,
  allowSearch = true,
  allowViewModeToggle = true,
  pageSize = 6,
}: ProjectsPageProps) {
  const [projects, setProjects] = useState<ProjectSchema[]>([]);
  const [displayedProjects, setDisplayedProjects] = useState<ProjectSchema[]>([]);
  // const { supabase } = useSupabase();
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] =
    useState<string[]>(initialStatuses);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [displayedCount, setDisplayedCount] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const statuses = [
    { key: "draft", label: "Draft", color: "bg-stone-100 text-stone-600" },
    {
      key: "proposed",
      label: "Proposed",
      color: "bg-amber-100 text-amber-800",
    },
    { key: "voting", label: "Voting", color: "bg-blue-100 text-blue-800" },
    { key: "active", label: "Active", color: "bg-theme-100 text-theme-800" },
    {
      key: "completed",
      label: "Completed",
      color: "bg-lime-100 text-lime-800",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      color: "bg-coral-100 text-coral-700",
    },
    {
      key: "archived",
      label: "Archived",
      color: "bg-stone-100 text-stone-600",
    },
  ].filter(
    (status) =>
      isAdminView || !["draft", "archived", "cancelled"].includes(status.key)
  );

  // Filter projects for display (client-side filtering for draft projects)
  const filterProjectsForDisplay = useCallback(
    (projectsList: ProjectSchema[]) => {
      return projectsList.filter((project) => {
        // Only show draft projects in admin view
        if (project.status === "draft" && !isAdminView) {
          return false;
        }
        return true;
      });
    },
    [isAdminView]
  );

  // Debounced search handler
  const debouncedFetchProjects = useCallback(
    debounce((pageNumber: number, searchTerm: string, append: boolean) => {
      fetchProjects(pageNumber, searchTerm, append);
    }, 300),
    [selectedStatuses]
  );

  // Fetch projects with pagination, search, and filters
  async function fetchProjects(
    pageNumber = 1,
    searchTerm = "",
    append = false
  ) {
    setIsFetching(true);
    setError(null);

    try {
      let statusFilters = [...selectedStatuses];
      if (isAdminView && !statusFilters.includes("draft")) {
        // In admin view, we might want to include draft in the query if it's selected
      } else if (!isAdminView) {
        statusFilters = statusFilters.filter((status) => status !== "draft");
      }

      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: String(pageSize),
        statuses: statusFilters.join(","),
        paginate: "true",
        sortBy: "created_at",
        sortOrder: "desc",
      });
      if (searchTerm && searchTerm.trim().length >= 2) {
        params.set("search", searchTerm.trim());
      }
      if (isAdminView) {
        params.set("includeHidden", "true");
      }

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load projects (${res.status})`);
      }

      const json = await res.json();
      const data = json.data as unknown[];
      const count = json.pagination?.total as number | undefined;

      const validatedProjects = (data || [])
        .map((project) => projectSchema.safeParse(project))
        .filter((result) => result.success)
        .map((result) => result.data as ProjectSchema);

      let newProjects: ProjectSchema[];
      if (append) {
        newProjects = [...projects, ...validatedProjects];
      } else {
        newProjects = validatedProjects;
      }

      // Apply client-side filtering
      const filteredForDisplay = filterProjectsForDisplay(newProjects);

      setProjects(newProjects);
      setDisplayedProjects(filteredForDisplay);
      setTotalCount(count || 0);
      setDisplayedCount(filteredForDisplay.length);
    } catch (err: any) {
      console.error("Error fetching projects:", err);
      setError(err.message || "Failed to fetch projects.");
      toast.error(err.message || "Failed to fetch projects.");
    } finally {
      setIsFetching(false);
      if (isInitialLoading && pageNumber === 1 && !append) {
        setIsInitialLoading(false);
      }
    }
  }

  // Load more projects for infinite scrolling
  const loadMore = useCallback(() => {
    // Check if we need to load more based on displayed projects vs server total
    // We need to account for the fact that some projects might be filtered out client-side
    if (!isFetching && projects.length < totalCount) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProjects(nextPage, search, true);
    }
  }, [projects.length, totalCount, isFetching, page, search]);

  // Fetch projects on initial load and when filters change
  useEffect(() => {
    // Reset all state when filters change
    setProjects([]);
    setDisplayedProjects([]);
    setPage(1);
    setTotalCount(0);
    setDisplayedCount(0);
    setError(null);

    // Small delay to ensure state is reset before fetching
    const timeoutId = setTimeout(() => {
      fetchProjects(1, search, false);
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [selectedStatuses]);

  // Handle search changes
  useEffect(() => {
    // Reset all state when search changes
    setProjects([]);
    setDisplayedProjects([]);
    setPage(1);
    setTotalCount(0);
    setDisplayedCount(0);
    setError(null);

    // Debounce the search
    const timeoutId = setTimeout(() => {
      debouncedFetchProjects(1, search, false);
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [search, debouncedFetchProjects]);

  // Update displayed projects when projects change (for client-side filtering)
  useEffect(() => {
    const filtered = filterProjectsForDisplay(projects);
    setDisplayedProjects(filtered);
    setDisplayedCount(filtered.length);
  }, [projects, filterProjectsForDisplay]);

  // Check if we've loaded all available projects
  const hasMoreProjects = projects.length < totalCount;
  const showEndMessage =
    displayedProjects.length > 0 && !hasMoreProjects && !isFetching;

  // Set up IntersectionObserver for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetching &&
          projects.length < totalCount
        ) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (sentinelRef.current && hasMoreProjects) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [loadMore, projects.length, totalCount, isFetching, hasMoreProjects]);

  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // Toggle status filters
  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedStatuses(initialStatuses);
    setSearch("");
  };

  // projects.forEach((project, index) => {
  //   const result = projectSchema.safeParse(project);

  //   if (result.success) {
  //     console.log(`✅ Project ${index + 1} (${project.title || project.id}): VALID`);
  //   } else {
  //     console.log(`❌ Project ${index + 1} (${project.title || project.id}): FAILED`);
  //     console.log('Raw project data:', project);
  //     console.log('Validation errors:', result.error.errors);

  //     // Check for common field name mismatches
  //     const commonMismatches = [
  //       { expected: 'target_amount', actual: 'goal_amount' },
  //       { expected: 'current_amount', actual: 'raised_amount' },
  //       { expected: 'cover_image', actual: 'image_url' },
  //       { expected: 'body_html', actual: 'content' },
  //     ];

  //     commonMismatches.forEach(mismatch => {
  //       if (project[mismatch.actual] && !project[mismatch.expected]) {
  //         console.log(`🔧 Potential fix: Rename '${mismatch.actual}' to '${mismatch.expected}'`);
  //       }
  //     });
  //   }
  // });

  // console.log('=== END DEBUG ===');

  // Initial loading state
  if (isInitialLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-p-light via-white to-theme-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LogoLoader />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-p-light via-white to-theme-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-theme-500 rounded-full mb-6">
            <Grid className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-p-dark mb-4">
            {title.includes(" ") ? (
              <>
                {title.split(" ")[0]}
                <span className="block text-theme-500">
                  {title.split(" ").slice(1).join(" ")}
                </span>
              </>
            ) : (
              <span className="text-theme-500">{title}</span>
            )}
          </h1>
          <p className="text-xl text-stone-200 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Search and Filter Bar */}
        {(allowSearch || allowStatusFilter || allowViewModeToggle) && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100/50 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search Input */}
              {allowSearch && (
                <div className="relative flex-1 w-full lg:max-w-md">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-200 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search projects by title or description..."
                    value={search}
                    onChange={handleSearch}
                    className="w-full pl-12 pr-4 py-3 border border-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-all bg-stone-100/30"
                  />
                </div>
              )}

              {/* Filter Toggle & View Mode */}
              <div className="flex items-center gap-3">
                {allowStatusFilter && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      showFilters ||
                      selectedStatuses.length < initialStatuses.length
                        ? "bg-theme-500 text-white shadow-md"
                        : "bg-stone-100 text-stone-200 hover:bg-stone-200"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {selectedStatuses.length < initialStatuses.length && (
                      <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                        {selectedStatuses.length}
                      </span>
                    )}
                  </button>
                )}

                {/* View Mode Toggle */}
                {allowViewModeToggle && (
                  <div className="flex bg-stone-100 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === "grid"
                          ? "bg-white text-theme-500 shadow-sm"
                          : "text-stone-200 hover:text-p-dark"
                      }`}
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === "list"
                          ? "bg-white text-theme-500 shadow-sm"
                          : "text-stone-200 hover:text-p-dark"
                      }`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              {isAdminView && (
                <Link href="/admin/projects/new">
                  <button
                    className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all bg-theme-500 text-white shadow-md`}
                  >
                    <Plus
                      strokeWidth={3}
                      absoluteStrokeWidth
                      className="w-5 h-5 sm:w-4 sm:h-4 "
                    />
                    <span className="hidden sm:block">New Project</span>
                  </button>
                </Link>
              )}
            </div>

            {/* Filter Options */}
            {allowStatusFilter && showFilters && (
              <div className="mt-6 pt-6 border-t border-stone-100">
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-sm font-medium text-p-dark">
                    Status:
                  </span>
                  {statuses.map((status) => (
                    <button
                      key={status.key}
                      onClick={() => toggleStatus(status.key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedStatuses.includes(status.key)
                          ? "bg-theme-500 text-white shadow-md scale-105"
                          : `${status.color} hover:scale-105 hover:shadow-sm`
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                  {selectedStatuses.length < initialStatuses.length && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-coral-500 hover:text-coral-600 font-medium"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Debug Info (remove in production) */}
        {/* {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-gray-100 rounded text-sm text-gray-600">
            <div>Projects loaded: {projects.length}</div>
            <div>Total count: {totalCount}</div>
            <div>Displayed: {displayedCount}</div>
            <div>Current page: {page}</div>
            <div>Page size: {pageSize}</div>
            <div>Has more: {hasMoreProjects.toString()}</div>
            <div>Is fetching: {isFetching.toString()}</div>
            <div>Should show load more: {(!isFetching && displayedProjects.length > 0 && hasMoreProjects).toString()}</div>
          </div>
        )} */}

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-stone-200">
            {displayedCount > 0 ? (
              <span>
                Showing{" "}
                <span className="font-semibold text-p-dark">
                  {displayedCount}
                </span>
                {totalCount > displayedCount && (
                  <>
                    {" "}
                    of{" "}
                    <span className="font-semibold text-p-dark">
                      {totalCount}
                    </span>
                  </>
                )}{" "}
                projects
              </span>
            ) : (
              !isFetching && <span>No projects found</span>
            )}
          </div>
        </div>

        {/* Projects Content */}
        <div className="mb-12">
          {displayedProjects.length === 0 ? (
            isFetching ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-theme-500 mb-4" />
                <p className="text-stone-200 text-lg">Searching projects...</p>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-stone-100 rounded-full mb-6">
                  <Search className="w-10 h-10 text-stone-200" />
                </div>
                <h3 className="text-2xl font-semibold text-p-dark mb-4">
                  No projects found
                </h3>
                <p className="text-stone-200 mb-6 max-w-md mx-auto">
                  Try adjusting your search terms or filters to find what you're
                  looking for.
                </p>
                {(search ||
                  selectedStatuses.length < initialStatuses.length) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-theme-500 text-white rounded-xl font-medium hover:bg-theme-600 transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )
          ) : (
            <ProjectsGrid
              projects={displayedProjects}
              isAdminView={isAdminView}
              gridClassName={
                viewMode === "grid"
                  ? "grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                  : "space-y-6"
              }
              viewMode={viewMode}
            />
          )}
        </div>

        {/* Infinite Scroll Sentinel */}
        {displayedProjects.length > 0 && hasMoreProjects && (
          <div
            ref={sentinelRef}
            className="h-20 flex items-center justify-center"
          >
            {isFetching && (
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-theme-500" />
                <span className="text-stone-200">Loading more projects...</span>
              </div>
            )}
          </div>
        )}

        {/* Load More Button (fallback) */}
        {!isFetching && displayedProjects.length > 0 && hasMoreProjects && (
          <div className="text-center">
            <button
              onClick={loadMore}
              className="inline-flex items-center gap-2 px-8 py-4 bg-theme-500 text-white rounded-xl font-medium hover:bg-theme-600 transition-all hover:scale-105 shadow-lg"
            >
              Load More Projects
            </button>
          </div>
        )}

        {/* End Message */}
        {showEndMessage && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-theme-100 rounded-full mb-4">
              <Grid className="w-8 h-8 text-theme-500" />
            </div>
            <p className="text-stone-200 text-lg">
              You've seen all available projects!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
