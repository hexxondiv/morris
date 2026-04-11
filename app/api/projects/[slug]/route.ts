// app/api/projects/[slug]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { auth, getAuth } from "@clerk/nextjs/server";
import { projectSchema, ProjectSchema } from "@/lib/zod-schema";
import { z } from "zod";
import { getUserRoleFromClerk } from "@/lib/actions";
import { isAuthorized } from "@/lib/utils";

interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  project_id: string | null;
  project_title?: string | null;
  recording_url: string | null;
  recording_password: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  status: "upcoming" | "ongoing" | "completed" | "canceled";
  created_at: string;
  updated_at: string | null;
}

interface TimelineStage {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  planned_cost: number;
  actual_cost: number | null;
  stage_order: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  completion_notes: string | null;
  media_urls: string[];
  completion_media_urls: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  completed_by: string | null;
}

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

        // Check if user is authenticated and admin
    const { userId } = await auth();
    const userRole = (await getUserRoleFromClerk(userId)) || "user";
    const isAdmin = isAuthorized(userRole, "admin");
    const isModerator = isAuthorized(userRole, "moderator");

    // For edit mode, require at least moderator permissions
    if (isEditMode && !isModerator) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    let projectQuery = supabaseAdmin.from("projects").select(`
      *,
      voting_periods!projects_voting_periods_fkey(*)
    `);

    // Check if the slug is actually a UUID (for backwards compatibility)
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug
      );

    if (isUUID) {
      projectQuery = projectQuery.eq("id", slug);
    } else {
      projectQuery = projectQuery.eq("slug", slug);
    }

    const { data: projectData, error: projectError } =
      await projectQuery.single();

    if (projectError || !projectData) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Skip draft projects for non-admins (unless in edit mode)
    if (projectData.status === "draft" && !isAdmin && !isEditMode) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Extract voting period from project data (already fetched)
    const votingPeriod: VotingPeriod | null = 
      (isEditMode || projectData.status === "voting") 
        ? (projectData.voting_periods as VotingPeriod | null)
        : null;

    // Fetch related events
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("events")
      .select(
        `
        id,
        creator_id,
        title,
        description,
        project_id,
        recording_url,
        recording_password,
        start_date,
        end_date,
        location,
        status,
        created_at,
        updated_at,
        projects (title)
      `
      )
      .eq("project_id", projectData.id)
      .order("start_date", { ascending: true });

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
    }

    // Fetch timeline stages if in edit mode or if project is active/completed
    let timeline: TimelineStage[] = [];
    if (
      isEditMode ||
      projectData.status === "active" ||
      projectData.status === "completed"
    ) {
      const { data: timelineData, error: timelineError } = await supabaseAdmin
        .from("project_timelines")
        .select("*")
        .eq("project_id", projectData.id)
        .order("stage_order", { ascending: true });

      if (timelineError) {
        console.error("Error fetching timeline:", timelineError);
      } else {
        timeline = timelineData || [];
      }
    }

    // Calculate timeline statistics
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
      project: projectData,
      events: events || [],
      timeline,
      timelineStats,
      votingPeriod,
      updates: [], // TODO: Add updates/posts if needed
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

// PUT method for updating projects (for consistency)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (await getUserRoleFromClerk(userId)) || "user";
    if (!isAuthorized(userRole, "moderator")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

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

    // Check if the slug is actually a UUID
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug
      );

    let updateQuery = supabaseAdmin.from("projects").update({
      ...validatedData.data,
      updated_at: new Date().toISOString(),
    });

    if (isUUID) {
      updateQuery = updateQuery.eq("id", slug);
    } else {
      updateQuery = updateQuery.eq("slug", slug);
    }

    const { data, error } = await updateQuery.select().single();

    if (error) {
      console.error("Error updating project:", error);
      return NextResponse.json(
        { error: "Failed to update project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ project: data });
  } catch (error) {
    console.error("Error in project update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
