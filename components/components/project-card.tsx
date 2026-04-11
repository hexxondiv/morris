// 'use client';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import Link from 'next/link';
// import { ProjectSchema } from '@/lib/zod-schema';
// import { cn } from '@/lib/utils';
// import PulsingOnlineIndicator from './pulse-online-indicator';
// import Image from 'next/image';

// interface ProjectCardProps {
//   project: ProjectSchema & { id?: string; slug?: string };
//   isAdminView?: boolean;
// }

// const statusStyles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | null | undefined; label: string }> = {
//   draft: { variant: 'secondary', label: 'Draft' },
//   proposed: { variant: 'outline', label: 'Proposed' },
//   voting: { variant: 'default', label: 'Voting' },
//   active: { variant: 'default', label: 'Active' },
//   completed: { variant: 'default', label: 'Completed' },
//   cancelled: { variant: 'destructive', label: 'Cancelled' },
//   archived: { variant: 'secondary', label: 'Archived' },
// };

// export function ProjectCard({ project, isAdminView = false }: ProjectCardProps) {
//   const { status, title, cover_image, slug, id } = project;
//   const statusConfig = statusStyles[status] || { variant: 'secondary', label: status };

//   // Only show draft projects in admin view
//   if (status === 'draft' && !isAdminView) return null;

//   return (
//     <div
//       className={cn(
//         'group relative h-[400px] sm:h-[480px] overflow-hidden rounded-3xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl',
//         status === 'draft' && 'opacity-75'
//       )}
//     >
//       <div className="relative w-full h-full">
//         <Image
//           src={cover_image || '/images/default_cover.webp'}
//           alt={`${title} cover`}
//           fill
//           className="object-cover transition-opacity duration-300 group-hover:opacity-90"
//           sizes="(max-width: 640px) 100vw, 100vw"
//           priority
//         />
//       </div>
//       <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
//       <div className="absolute bottom-0 left-0 right-0 z-10 px-6 sm:px-8 py-7 sm:py-9 space-y-2">
//         <div className="flex items-center justify-between text-white">
//           <div className="flex items-center space-x-4">
//             <span className="text-xl" role="img" aria-label="Nigerian flag">
//               🇳🇬
//             </span>
//             <PulsingOnlineIndicator size={20} />
//             <Badge variant={statusConfig.variant} className="text-sm font-medium">
//               {statusConfig.label}
//             </Badge>
//           </div>
//           {isAdminView && status === 'draft' && (
//             <Link href={`/admin/projects/edit/${id}`} aria-label={`Edit ${title}`}>
//               <Button variant="outline" size="sm" className="text-white border-white hover:bg-white/30">
//                 Edit
//               </Button>
//             </Link>
//           )}
//         </div>
//         <h3 className="font-semibold text-xl text-white leading-relaxed line-clamp-2">{title}</h3>
//         <Link href={`/projects/${slug}`} aria-label={`View ${title}`}>
//           <Button
//             variant="outline"
//             className="mt-4 h-12 rounded-full px-6 bg-transparent text-white border-white hover:bg-white/30 transition-colors"
//           >
//             <span className="inline-flex items-center">
//               View Project
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 className="w-5 h-5 ml-2"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeWidth="1.5"
//               >
//                 <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5M21 12H3" />
//               </svg>
//             </span>
//           </Button>
//         </Link>
//       </div>
//     </div>
//   );
// }

"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ProjectSchema } from "@/lib/zod-schema";
import { capitalize, cn } from "@/lib/utils";
import PulsingOnlineIndicator from "./pulse-online-indicator";
import Image from "next/image";
import { Calendar, Edit3 } from "lucide-react";

interface ProjectCardProps {
  project: ProjectSchema;
  isAdminView?: boolean;
  viewMode?: "grid" | "list";
}

const statusStyles: Record<
  string,
  {
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | null
      | undefined;
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  draft: {
    variant: "secondary",
    label: "Draft",
    bgColor: "bg-stone-100",
    textColor: "text-stone-200",
    borderColor: "border-stone-200",
  },
  proposed: {
    variant: "outline",
    label: "Proposed",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  voting: {
    variant: "default",
    label: "Voting",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  active: {
    variant: "default",
    label: "Active",
    bgColor: "bg-theme-50",
    textColor: "text-theme-700",
    borderColor: "border-theme-200",
  },
  completed: {
    variant: "default",
    label: "Completed",
    bgColor: "bg-lime-50",
    textColor: "text-lime-700",
    borderColor: "border-lime-200",
  },
  cancelled: {
    variant: "destructive",
    label: "Cancelled",
    bgColor: "bg-coral-50",
    textColor: "text-coral-700",
    borderColor: "border-coral-200",
  },
  archived: {
    variant: "secondary",
    label: "Archived",
    bgColor: "bg-stone-100",
    textColor: "text-stone-200",
    borderColor: "border-stone-200",
  },
};

export function ProjectCard({
  project,
  isAdminView = false,
  viewMode = "grid",
}: ProjectCardProps) {
  const {
    status,
    title,
    cover_image,
    slug,
    id,
    description,
    goal_amount,
    state,
    current_amount,
    created_at,
  } = project;
  const statusConfig = statusStyles[status] || statusStyles.proposed;

  // Only show draft projects in admin view
  if (status === "draft" && !isAdminView) return null;

  // Calculate progress percentage
  const progress = goal_amount
    ? Math.min(((current_amount || 0) / goal_amount) * 100, 100)
    : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "group bg-white rounded-2xl shadow-sm border border-stone-100/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01]",
          status === "draft" && "opacity-75"
        )}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Image Section */}
          <div className="relative w-full sm:w-80 h-48 sm:h-auto overflow-hidden">
            <Image
              src={cover_image || "/images/default_cover.webp"}
              alt={`${title} cover`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 320px"
            />
            <div className="absolute top-4 left-4">
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm",
                  statusConfig.bgColor,
                  statusConfig.textColor,
                  "bg-opacity-90"
                )}
              >
                <PulsingOnlineIndicator size={8} />
                {statusConfig.label}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-6 sm:p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-p-dark mb-2 line-clamp-2 group-hover:text-theme-600 transition-colors">
                  {title}
                </h3>
                <p className="text-stone-200 line-clamp-2 mb-4">
                  {description || "No description available"}
                </p>
              </div>
              {isAdminView && status === "draft" && (
                <Link
                  href={`/admin/projects/edit/${id}`}
                  aria-label={`Edit ${title}`}
                >
                  <Button variant="outline" size="sm" className="ml-4">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Progress Bar */}
            {goal_amount && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-p-dark">
                    {formatCurrency(current_amount || 0)} raised
                  </span>
                  <span className="text-sm text-stone-200">
                    Goal: {formatCurrency(goal_amount)}
                  </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-theme-500 to-theme-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-right mt-1">
                  <span className="text-sm font-medium text-theme-600">
                    {progress.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-stone-200">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {created_at && formatDate(created_at)}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xl" role="img" aria-label="Nigerian flag">
                  🇳🇬
                </span>
                Nigeria
              </div>
            </div>

            {/* Action Button */}
            <Link href={`/projects/${slug}`} aria-label={`View ${title}`}>
              <Button className="w-full sm:w-auto bg-theme-500 hover:bg-theme-600 text-white font-medium px-8 py-3 rounded-xl transition-all hover:scale-105 shadow-md">
                View Project
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      className={cn(
        "group relative h-[400px] sm:h-[480px] overflow-hidden rounded-3xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
        status === "draft" && "opacity-75"
      )}
    >
      <div className="relative w-full h-full">
        <Image
          src={cover_image || "/images/default_cover.webp"}
          alt={`${title} cover`}
          fill
          className="object-cover transition-opacity duration-300 group-hover:opacity-90"
          sizes="(max-width: 640px) 100vw, 100vw"
          priority
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 sm:px-8 py-7 sm:py-9 space-y-2">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <span className="text-xl" role="img" aria-label="Nigerian flag">
              🇳🇬
            </span>
            {/* Project Status Badge */}
            <div className="">
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-theme-100">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full",
                    status === "active"
                      ? "bg-lime w-2 h-2 animate-pulse"
                      : status === "completed"
                      ? "bg-theme-600"
                      : status === "voting"
                      ? "bg-gold w-2 h-2 animate-pulse"
                      : "bg-gray-400"
                  )}
                />
                <span className="text-sm font-medium text-theme-900">
                  {status === "active"
                    ? "In Progress"
                    : status === "completed"
                    ? "Completed"
                    : status === "voting"
                    ? "Voting"
                    : capitalize(status)}
                </span>
              </div>
            </div>
          </div>
          {isAdminView && status === "draft" && (
            <Link
              href={`/admin/projects/edit/${id}`}
              aria-label={`Edit ${title}`}
            >
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white hover:bg-white/30"
              >
                Edit
              </Button>
            </Link>
          )}
        </div>
        <h3 className="font-semibold text-xl text-white leading-relaxed line-clamp-2">
          {title}
        </h3>
        <Link href={`/projects/${slug}`} aria-label={`View ${title}`}>
          <Button
            variant="outline"
            className="mt-4 h-12 rounded-full px-6 bg-transparent text-white border-white hover:bg-white/30 transition-colors"
          >
            <span className="inline-flex items-center">
              View Project
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 ml-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
