// app/api/projects/[slug]/timeline/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { auth } from "@clerk/nextjs/server";
import { getUserRoleFromClerk } from "@/lib/actions";
import { isAuthorized } from "@/lib/utils";

// GET: Fetch project timeline
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, status")
      .eq("slug", slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get timeline stages
    const { data: timeline, error: timelineError } = await supabaseAdmin
      .from("project_timelines")
      .select("*")
      .eq("project_id", project.id)
      .order("stage_order, status", { ascending: true });

    if (timelineError) {
      console.error("Timeline fetch error:", timelineError);
      return NextResponse.json(
        { error: "Failed to fetch timeline" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      project: { id: project.id, status: project.status },
      timeline: timeline || [],
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create timeline stages (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    const role = await getUserRoleFromClerk(userId);
    if (!isAuthorized(role, "moderator")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { slug } = await params;
    const body = await request.json();
    const { stages } = body;

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json(
        { error: "Invalid stages data" },
        { status: 400 }
      );
    }

    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, status")
      .eq("slug", slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if project is in active status
    if (project.status !== "active") {
      return NextResponse.json(
        {
          error: "Timeline can only be created for active projects",
        },
        { status: 400 }
      );
    }

    // Check if timeline already exists
    // const { data: existingTimeline } = await supabaseAdmin
    //   .from("project_timelines")
    //   .select("id")
    //   .eq("project_id", project.id)
    //   .limit(1);

    // if (existingTimeline && existingTimeline.length > 0) {
    //   return NextResponse.json(
    //     {
    //       error: "Timeline already exists for this project",
    //     },
    //     { status: 400 }
    //   );
    // }

    // Prepare timeline data
    const timelineData = stages.map((stage: any, index: number) => ({
      project_id: project.id,
      title: stage.title,
      description: stage.description || null,
      planned_cost: parseFloat(stage.planned_cost) || 0,
      stage_order: stage.stage_order || index + 1,
      status: "pending",
      planned_start_date: stage.planned_start_date || null,
      planned_end_date: stage.planned_end_date || null,
      media_urls: stage.media_urls || [],
      created_by: userId,
    }));

    // Insert timeline stages
    const { data: timeline, error: insertError } = await supabaseAdmin
      .from("project_timelines")
      .insert(timelineData)
      .select("*")
      .order("stage_order", { ascending: true });

    if (insertError) {
      console.error("Timeline insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create timeline" },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error("API error:", error);
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    const role = await getUserRoleFromClerk(userId);
    if (!isAuthorized(role, "moderator")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { slug } = await params;
    const body = await request.json();
    const { stages } = body;

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json(
        { error: "Invalid stages data" },
        { status: 400 }
      );
    }

    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, status")
      .eq("slug", slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get existing timeline stages
    const { data: existingStages, error: existingError } = await supabaseAdmin
      .from("project_timelines")
      .select("*")
      .eq("project_id", project.id)
      .order("stage_order", { ascending: true });

    if (existingError) {
      console.error("Error fetching existing timeline:", existingError);
      return NextResponse.json(
        { error: "Failed to fetch existing timeline" },
        { status: 500 }
      );
    }

    // Check if there are any completed stages - if so, we can only modify pending stages
    const completedStages = (existingStages || []).filter(
      (stage) => stage.status === "completed"
    );
    const pendingStages = (existingStages || []).filter(
      (stage) => stage.status === "pending"
    );

    // If there are completed stages, we need to be careful about updates
    if (completedStages.length > 0) {
      // Delete only pending stages and add new ones
      if (pendingStages.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from("project_timelines")
          .delete()
          .eq("project_id", project.id)
          .eq("status", "pending");

        if (deleteError) {
          console.error("Error deleting pending stages:", deleteError);
          return NextResponse.json(
            { error: "Failed to update timeline" },
            { status: 500 }
          );
        }
      }

      // Add new stages starting from the next order after completed stages
      const nextOrder = completedStages.length + 1;
      const newStageData = stages.map((stage: any, index: number) => ({
        project_id: project.id,
        title: stage.title,
        description: stage.description || null,
        planned_cost: parseFloat(stage.planned_cost) || 0,
        stage_order: nextOrder + index,
        status: "pending",
        planned_start_date: stage.planned_start_date || null,
        planned_end_date: stage.planned_end_date || null,
        media_urls: stage.media_urls || [],
        created_by: userId,
      }));

      if (newStageData.length > 0) {
        const { data: newTimeline, error: insertError } = await supabaseAdmin
          .from("project_timelines")
          .insert(newStageData)
          .select("*");

        if (insertError) {
          console.error("Error inserting new stages:", insertError);
          return NextResponse.json(
            { error: "Failed to update timeline" },
            { status: 500 }
          );
        }
      }
    } else {
      // No completed stages, we can completely replace the timeline
      // Delete all existing stages
      if (existingStages && existingStages.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from("project_timelines")
          .delete()
          .eq("project_id", project.id);

        if (deleteError) {
          console.error("Error deleting existing timeline:", deleteError);
          return NextResponse.json(
            { error: "Failed to update timeline" },
            { status: 500 }
          );
        }
      }

      // Insert new timeline
      const timelineData = stages.map((stage: any, index: number) => ({
        project_id: project.id,
        title: stage.title,
        description: stage.description || null,
        planned_cost: parseFloat(stage.planned_cost) || 0,
        stage_order: index + 1,
        status: "pending",
        planned_start_date: stage.planned_start_date || null,
        planned_end_date: stage.planned_end_date || null,
        media_urls: stage.media_urls || [],
        created_by: userId,
      }));

      const { data: newTimeline, error: insertError } = await supabaseAdmin
        .from("project_timelines")
        .insert(timelineData)
        .select("*")
        .order("stage_order", { ascending: true });

      if (insertError) {
        console.error("Error inserting timeline:", insertError);
        return NextResponse.json(
          { error: "Failed to update timeline" },
          { status: 500 }
        );
      }
    }

    // Fetch updated timeline
    const { data: updatedTimeline, error: fetchError } = await supabaseAdmin
      .from("project_timelines")
      .select("*")
      .eq("project_id", project.id)
      .order("stage_order", { ascending: true });

    if (fetchError) {
      console.error("Error fetching updated timeline:", fetchError);
      return NextResponse.json(
        { error: "Timeline updated but failed to fetch result" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      timeline: updatedTimeline,
      message: "Timeline updated successfully",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
