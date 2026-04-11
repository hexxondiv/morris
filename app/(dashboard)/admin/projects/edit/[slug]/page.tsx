// app/admin/projects/edit/[slug]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { projectSchema, ProjectSchema } from "@/lib/zod-schema";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useEnsureAuthorized } from "@/lib/auth-client";
import ProjectForm from "@/components/components/project-form";

interface TimelineStage {
  id: string;
  title: string;
  description: string | null;
  planned_cost: number;
  stage_order: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  status: string;
}

interface VotingPeriod {
  id: string;
  start_date: string;
  end_date: string;
}

interface ProjectWithTimeline extends ProjectSchema {
  id: string;
  timeline?: TimelineStage[];
  votingPeriod?: VotingPeriod;
}

export default function EditProjectPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [project, setProject] = useState<ProjectWithTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const { isLoading: isAuthLoading, isUserAuthorized } =
  // useEnsureAuthorized("moderator");
  const isUserAuthorized = true;

  useEffect(() => {
    async function fetchProject() {
      if (!slug) {
        setError("Project slug is missing");
        setLoading(false);
        return;
      }

      try {
        // Fetch project with edit mode to get timeline data
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/${slug}?edit=true`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Project not found");
          } else if (response.status === 403) {
            throw new Error("You don't have permission to edit this project");
          }
          throw new Error(`Failed to fetch project: ${response.status}`);
        }

        const data = await response.json();
        
        const validatedProject = projectSchema.safeParse(data.project);
        if (!validatedProject.success) {
          console.error("Invalid project data:", validatedProject.error);
          throw new Error("Invalid project data received from server");
        }

        // Prepare the project data with timeline and voting period
        const projectWithExtras: ProjectWithTimeline = {
          ...validatedProject.data,
          id: data.project.id,
          cover_image: validatedProject.data.cover_image ?? undefined,
          timeline: data.timeline || [],
          votingPeriod: data.votingPeriod || undefined,
        };

        // If voting period exists, add dates to the project
        if (data.votingPeriod) {
          projectWithExtras.start_date = data.votingPeriod.start_date;
          projectWithExtras.end_date = data.votingPeriod.end_date;
        }

        setProject(projectWithExtras);
      } catch (err: any) {
        console.error("Error fetching project:", err);
        setError(err.message || "Failed to load project");
        toast.error(err.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    }

    if (isUserAuthorized) {
      fetchProject();
    }
  }, [slug, isUserAuthorized]);

  if ((loading && isUserAuthorized)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-50 to-theme-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-theme-600" />
          <p className="text-theme-700">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!isUserAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-50 to-theme-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-theme-900 mb-2">Access Denied</h1>
          <p className="text-theme-600">You don't have permission to edit projects.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-50 to-theme-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-700 mb-2">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-theme-500 text-white rounded-lg hover:bg-theme-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-50 to-theme-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-theme-900 mb-2">Project Not Found</h1>
          <p className="text-theme-600">The requested project could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <ProjectForm
      project={project} 
      onClose={() => window.history.back()} 
    />
  );
}