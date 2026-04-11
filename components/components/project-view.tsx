"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { ProjectSchema } from "@/lib/zod-schema";
import { capitalize, cn, formatCurrency, isAuthorized } from "@/lib/utils";
import { useState } from "react";
import Image from "next/image";
import TimelineManagement from "@/components/components/timeline/timeline-management";
import { Role } from "@/types/database.types";
import "@/styles/tiptap-content.scss"
import { useCurrentRole } from "@/lib/auth-client";

interface ProjectViewProps {
  project: ProjectSchema & { id?: string; slug?: string; body_html?: string };
  updates?: Array<{
    id: string;
    title: string;
    content: string;
    postedAt: string;
    image?: string;
    authorImage?: string;
    authorName?: string;
  }>;
  isAdminView?: boolean;
}

const statusStyles: Record<
  string,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  draft: { variant: "secondary", label: "Draft" },
  proposed: { variant: "outline", label: "Proposed" },
  voting: { variant: "default", label: "Voting" },
  active: { variant: "default", label: "Active" },
  completed: { variant: "secondary", label: "Completed" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  archived: { variant: "secondary", label: "Archived" },
};

function ProjectHeader({
  project,
  isAdminView,
}: {
  project: ProjectViewProps["project"];
  isAdminView?: boolean;
}) {
  return (
    <header className="space-y-6 text-center">
      <h1 className="text-3xl sm:text-4xl font-bold text-theme-900 dark:text-theme-100 flex items-center justify-center gap-3 flex-wrap">
        {project.title}
      </h1>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {isAdminView &&
          (project.status === "draft" ||
            project.status === "proposed" ||
            project.status === "active" ||
            project.status === "voting" ||
            project.status === "completed") && (
            <>
              <Link
                href={`/admin/projects/edit/${project.slug}`}
                className="inline-flex"
              >
                <Button
                  variant="outline"
                  className="rounded-full border-theme-500 text-theme-700 hover:bg-theme-50"
                >
                  Edit Project
                </Button>
              </Link>
              <Link href="/projects">
                <Button
                  variant="secondary"
                  className="rounded-full bg-theme-100 text-theme-800 hover:bg-theme-200"
                >
                  Back to Projects
                </Button>
              </Link>
            </>
          )}
      </div>
    </header>
  );
}

function ProjectHero({ project }: { project: ProjectViewProps["project"] }) {
  const encodedParam = project.slug
    ? Buffer.from(JSON.stringify({ slug: project.slug })).toString("base64")
    : null;

  return (
    <Card className="overflow-hidden border-theme-200 shadow-lg">
      <div className="relative h-64 sm:h-96">
        <div className="h-full w-full">
          <Image
            src={project.cover_image || "/images/image.jpg"}
            alt={`${project.title} cover`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1536px) 100vw, 100vw"
            priority={false}
            style={{ objectFit: "cover" }}
          />
        </div>
        {project.status === "draft" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-lg font-semibold bg-theme-900/80 px-4 py-2 rounded-lg">
              Unpublished Draft
            </span>
          </div>
        )}

        {/* Project Status Badge */}
        <div className="absolute bottom-6 left-6">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-theme-100">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                project.status === "active"
                  ? "bg-theme-500"
                  : project.status === "completed"
                  ? "bg-theme-600"
                  : project.status === "voting"
                  ? "bg-theme-400"
                  : "bg-gray-400"
              )}
            />
            <span className="text-sm font-medium text-theme-900">
              {project.status === "active"
                ? "In Progress"
                : project.status === "completed"
                ? "Completed"
                : project.status === "voting"
                ? "Voting"
                : capitalize(project.status)}
            </span>
          </div>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-theme-600 dark:text-theme-400">
              Fund Capital Used
            </p>
            <h2 className="text-3xl font-bold text-theme-900 dark:text-theme-100">
              {formatCurrency(project.current_amount || 0)}
            </h2>
            <div className="mt-3">
              <Progress
                value={
                  project.goal_amount
                    ? ((project.current_amount || 0) / project.goal_amount) *
                      100
                    : 0
                }
                className="h-3"
              />
              <div className="flex justify-between text-xs text-theme-600 mt-2">
                <span>{formatCurrency(project.current_amount || 0)}</span>
                <span>{formatCurrency(project.goal_amount || 0)}</span>
              </div>
            </div>
          </div>
          <p className="text-theme-700 dark:text-theme-300 leading-relaxed">
            {project.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard" className="flex-1">
              <Button className="w-full rounded-full bg-theme-500 hover:bg-theme-600 text-white border-0">
                My Dashboard
              </Button>
            </Link>
            {project.slug ? (
              <Link href={`/pledge?p=${encodedParam}`} className="flex-1">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-theme-500 text-theme-700 hover:bg-theme-50"
                >
                  Donate to Project
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                className="w-full rounded-full border-theme-300 text-theme-600"
                disabled
              >
                Donate to Project
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectDetails({ project }: { project: ProjectViewProps["project"] }) {
  const [isOpen, setIsOpen] = useState(true);
  const statusConfig = statusStyles[project.status] || {
    variant: "secondary",
    label: project.status,
  };

  return (
    <Card className="border-theme-200 shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-theme-50/50 transition-colors rounded-t-lg">
            <CardTitle className="text-lg font-medium text-theme-900 dark:text-theme-100">
              Project Details
            </CardTitle>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-theme-600 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="divide-y divide-theme-200 dark:divide-theme-700">
            <li className="grid grid-cols-2 px-6 py-4 hover:bg-theme-50/25 dark:hover:bg-theme-900/20 transition-colors">
              <span className="text-lg font-medium text-theme-800 dark:text-theme-200">
                Status
              </span>
              <span className="text-lg font-medium text-theme-900 dark:text-theme-100 text-right">
                <Badge
                  variant={statusConfig.variant}
                  className={cn(
                    "text-xs font-semibold px-3 py-1 rounded-full",
                    statusConfig.variant === "destructive" &&
                      "bg-red-600 text-white",
                    statusConfig.variant === "default" &&
                      "bg-theme-500 text-white",
                    statusConfig.variant === "secondary" &&
                      "bg-theme-100 text-theme-800",
                    statusConfig.variant === "outline" &&
                      "border-theme-500 text-theme-700"
                  )}
                >
                  {statusConfig.label}
                </Badge>
              </span>
            </li>
            <li className="grid grid-cols-2 px-6 py-4 hover:bg-theme-50/25 dark:hover:bg-theme-900/20 transition-colors">
              <span className="text-lg font-medium text-theme-800 dark:text-theme-200">
                Region
              </span>
              <span className="text-lg font-medium text-theme-900 dark:text-theme-100 text-right">
                {project.state && project.country
                  ? `${capitalize(project.state)}, ${capitalize(
                      project.country
                    )}`
                  : project.state
                  ? capitalize(project.state)
                  : project.country
                  ? capitalize(project.country)
                  : "N/A"}
              </span>
            </li>
            <li className="grid grid-cols-2 px-6 py-4 hover:bg-theme-50/25 dark:hover:bg-theme-900/20 transition-colors">
              <span className="text-lg font-medium text-theme-800 dark:text-theme-200">
                Sector
              </span>
              <span className="text-lg font-medium text-theme-900 dark:text-theme-100 text-right">
                {project.sector ? capitalize(project.sector) : "N/A"}
              </span>
            </li>
            <li className="grid grid-cols-2 px-6 py-4 hover:bg-theme-50/25 dark:hover:bg-theme-900/20 transition-colors">
              <span className="text-lg font-medium text-theme-800 dark:text-theme-200">
                Goal Amount
              </span>
              <span className="text-lg font-medium text-theme-900 dark:text-theme-100 text-right">
                {formatCurrency(project.goal_amount || 0)}
              </span>
            </li>
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ProjectStory({ project }: { project: ProjectViewProps["project"] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpand, setShowExpand] = useState(false);

  return (
    <Card className="border-theme-200 shadow-sm">
      <CardHeader className="border-b border-theme-100">
        <CardTitle className="text-lg font-medium text-theme-900 dark:text-theme-100 flex items-center gap-2">
          <div className="w-1 h-6 bg-theme-500 rounded-full"></div>
          The Story
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 tiptap-content">
        <div
          className={cn("relative", !isExpanded && "max-h-96 overflow-hidden")}
        >
          <div
            className="prose prose-theme dark:prose-invert max-w-none prose-headings:text-theme-900 prose-p:text-theme-700 prose-a:text-theme-600 hover:prose-a:text-theme-500"
            dangerouslySetInnerHTML={{ __html: project.body_html || "" }}
            ref={(el) => {
              if (el && el.scrollHeight > 384) {
                // 96 * 4 = 384px
                setShowExpand(true);
              }
            }}
          />
          {!isExpanded && showExpand && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/90 to-transparent pt-12 pb-6">
              <Button
                variant="outline"
                onClick={() => setIsExpanded(true)}
                className="mx-auto block border-theme-500 text-theme-700 hover:bg-theme-50"
              >
                Read More
              </Button>
            </div>
          )}
        </div>
        {isExpanded && showExpand && (
          <Button
            variant="outline"
            onClick={() => setIsExpanded(false)}
            className="mt-4 border-theme-300 text-theme-600 hover:bg-theme-50"
          >
            Show Less
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectUpdates({
  updates,
}: {
  updates?: ProjectViewProps["updates"];
}) {
  if (!updates?.length) return null;

  return (
    <section className="space-y-6">
      <header className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="h-px bg-theme-200 flex-1"></div>
          <div className="px-6">
            <h5 className="text-sm font-medium uppercase tracking-widest text-theme-600 dark:text-theme-400">
              Updates
            </h5>
          </div>
          <div className="h-px bg-theme-200 flex-1"></div>
        </div>
        <h2 className="text-2xl font-bold text-theme-900 dark:text-theme-100">
          From the Field
        </h2>
      </header>
      <div className="space-y-6">
        {updates.map((update) => (
          <Card key={update.id} className="border-theme-200 shadow-sm">
            <CardHeader className="border-b border-theme-100">
              <h3 className="text-xl font-semibold text-theme-900 dark:text-theme-100">
                {update.title}
              </h3>
              <div className="flex items-center gap-2 pt-2">
                {update.authorImage && (
                  <img
                    src={update.authorImage}
                    alt={`Posted by ${update.authorName}`}
                    className="h-10 w-10 rounded-full border-2 border-theme-200"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-theme-600 dark:text-theme-400">
                    Posted {new Date(update.postedAt).toLocaleDateString()}
                  </p>
                  {update.authorName && (
                    <p className="text-sm text-theme-500 dark:text-theme-500">
                      By {update.authorName}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 simple-editor-content">
              <div
                className="prose prose-theme dark:prose-invert max-w-none prose-headings:text-theme-900 prose-p:text-theme-700"
                dangerouslySetInnerHTML={{ __html: update.content }}
              />
              {update.image && (
                <div className="mt-6">
                  <img
                    src={update.image}
                    alt="Update image"
                    className="rounded-lg w-full border border-theme-200"
                    loading="lazy"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function ProjectView({
  project,
  updates,
  isAdminView = false,
}: ProjectViewProps) {
  if (project?.status === "draft" && !isAdminView) return null;
  const userRole = useCurrentRole() as Role;
  isAdminView = isAuthorized(userRole, "moderator");
  // console.log(JSON.stringify(project));
  const showTimeline =
    (project && project?.status === "active") ||
    project?.status === "completed";

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-50 to-theme-100">
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <ProjectHeader project={project} isAdminView={isAdminView} />
        <ProjectHero project={project} />
        <ProjectDetails project={project} />
        <ProjectStory project={project} />

        {/* Timeline Section - Only show for active or completed projects */}
        {showTimeline && project.slug && (
          <>
            <header className="text-center space-y-4 pt-8">
              <div className="flex items-center justify-center">
                <div className="h-px bg-theme-200 flex-1"></div>
                <div className="px-6">
                  <h5 className="text-sm font-medium uppercase tracking-widest text-theme-600 dark:text-theme-400">
                    Implementation
                  </h5>
                </div>
                <div className="h-px bg-theme-200 flex-1"></div>
              </div>
              <h2 className="text-2xl font-bold text-theme-900 dark:text-theme-100">
                Project Milestones
              </h2>
              <p className="text-theme-600 dark:text-theme-400 max-w-2xl mx-auto">
                Track the step-by-step implementation of this project and see
                real progress updates from the field.
              </p>
            </header>
            <TimelineManagement
              projectSlug={project.slug}
              projectStatus={project.status}
              isAdminView={isAdminView}
            />
          </>
        )}

        {/* Updates Section */}
        <ProjectUpdates updates={updates} />

        <footer className="text-center text-sm text-theme-500 dark:text-theme-400 border-t border-theme-200 pt-8">
          Need help or have a question?{" "}
          <Link
            href="/contact"
            className="underline hover:text-theme-600 transition-colors"
          >
            Contact our team
          </Link>
        </footer>
      </main>
    </div>
  );
}
