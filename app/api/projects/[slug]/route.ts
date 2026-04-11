// app/api/projects/[slug]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { projectSchema } from "@/lib/zod-schema";
import { isAuthorized } from "@/lib/utils";
import { getSession } from "@/lib/auth/server";
import { normalizeRole } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/server";
import {
  getProjectBySlugOrId,
  listEventsForProject,
  mapProjectDetailRow,
  mapTimelineStages,
  mapVotingPeriod,
  updateProjectBySlugOrId,
} from "@/lib/repositories/project-repository";

interface VotingPeriod {
  id: string;
  project_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const isEditMode = url.searchParams.get("edit") === "true";

    const session = await getSession();
    const userRole = session?.user?.role
      ? normalizeRole(session.user.role)
      : "user";
    const isAdmin = isAuthorized(userRole, "admin");
    const isModerator = isAuthorized(userRole, "moderator");

    if (isEditMode && !isModerator) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const project = await getProjectBySlugOrId(slug);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = mapProjectDetailRow(project);

    if (projectData.status === "draft" && !isAdmin && !isEditMode) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const votingPeriod: VotingPeriod | null =
      isEditMode || projectData.status === "voting"
        ? project.votingPeriod
          ? mapVotingPeriod(project.votingPeriod)
          : null
        : null;

    const events = await listEventsForProject(project.id);

    let timeline: ReturnType<typeof mapTimelineStages> = [];
    if (
      isEditMode ||
      projectData.status === "active" ||
      projectData.status === "completed"
    ) {
      const stages = project.timeline?.stages ?? [];
      timeline = mapTimelineStages(project.id, stages);
    }

    const timelineStats =
      timeline.length > 0
        ? {
            total_stages: timeline.length,
            completed_stages: timeline.filter(
              (stage) => stage.status === "completed"
            ).length,
            total_planned_cost: timeline.reduce(
              (sum, stage) => sum + stage.planned_cost,
              0
            ),
            total_actual_cost: timeline
              .filter((stage) => stage.status === "completed")
              .reduce((sum, stage) => sum + (stage.actual_cost || 0), 0),
            completion_percentage:
              timeline.length > 0
                ? (timeline.filter((stage) => stage.status === "completed")
                    .length /
                    timeline.length) *
                  100
                : 0,
          }
        : null;

    return NextResponse.json({
      project: { ...projectData, voting_periods: votingPeriod },
      events,
      timeline,
      timelineStats,
      votingPeriod,
      updates: [],
      isAdminView: isAdmin,
      isEditMode,
    });
  } catch (error) {
    console.error("Error in project API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const auth = await requireRole("moderator");
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validatedData = projectSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Invalid project data",
          details: validatedData.error.issues,
        },
        { status: 400 }
      );
    }

    const d = validatedData.data;
    const updated = await updateProjectBySlugOrId(slug, {
      title: d.title,
      description: d.description,
      goal_amount: d.goal_amount,
      status: d.status,
      state: d.state ?? null,
      country: d.country ?? null,
      sector: d.sector ?? null,
      body_html: d.body_html ?? null,
      current_amount: d.current_amount,
      slug: d.slug,
      creator_id: d.creator_id,
    });

    return NextResponse.json({
      project: { ...updated, voting_periods: null },
    });
  } catch (error) {
    console.error("Error in project update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
