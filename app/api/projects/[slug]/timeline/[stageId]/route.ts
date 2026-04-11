import { getUserRoleFromClerk } from "@/lib/actions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorized } from "@/lib/utils";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; stageId: string }> }
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

    // Await the params Promise
    const { slug, stageId } = await params;
    const body = await request.json();

    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update stage
    const { data: updatedStage, error: updateError } = await supabaseAdmin
      .from("project_timelines")
      .update({
        title: body.title,
        description: body.description,
        planned_cost: parseFloat(body.planned_cost) || 0,
        planned_start_date: body.planned_start_date || null,
        planned_end_date: body.planned_end_date || null,
        media_urls: body.media_urls || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", stageId)
      .eq("project_id", project.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Stage update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update stage" },
        { status: 500 }
      );
    }

    return NextResponse.json({ stage: updatedStage });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; stageId: string }> }
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

    // Await the params Promise
    const { slug, stageId } = await params;

    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if stage exists and is not completed
    const { data: stage, error: stageError } = await supabaseAdmin
      .from("project_timelines")
      .select("status, stage_order")
      .eq("id", stageId)
      .eq("project_id", project.id)
      .single();

    if (stageError || !stage) {
      return NextResponse.json(
        { error: "Timeline stage not found" },
        { status: 404 }
      );
    }

    if (stage.status === "completed") {
      return NextResponse.json(
        {
          error: "Cannot delete completed stages",
        },
        { status: 400 }
      );
    }

    // Delete stage
    const { error: deleteError } = await supabaseAdmin
      .from("project_timelines")
      .delete()
      .eq("id", stageId)
      .eq("project_id", project.id);

    if (deleteError) {
      console.error("Stage delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete stage" },
        { status: 500 }
      );
    }

    // Reorder remaining stages
    const { data: remainingStages, error: remainingError } = await supabaseAdmin
      .from("project_timelines")
      .select("id")
      .eq("project_id", project.id)
      .gt("stage_order", stage.stage_order)
      .order("stage_order", { ascending: true });

    if (!remainingError && remainingStages) {
      for (let i = 0; i < remainingStages.length; i++) {
        await supabaseAdmin
          .from("project_timelines")
          .update({ stage_order: stage.stage_order + i })
          .eq("id", remainingStages[i].id);
      }
    }

    return NextResponse.json({ message: "Stage deleted successfully" });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}