"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../supabase-admin";
import { getUserRoleFromClerk } from ".";
import { isAuthorized } from "../utils";
import {
  TimelineStage,
  TimelineStats,
  CreateTimelineStageData,
  CompleteStageData,
} from "@/types/timeline";

export async function getProjectTimeline(projectSlug: string): Promise<{
  project: { id: string; status: string } | null;
  timeline: TimelineStage[];
  stats: TimelineStats | null;
}> {
  try {
    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, status")
      .eq("slug", projectSlug)
      .single();

    if (projectError || !project) {
      return { project: null, timeline: [], stats: null };
    }

    // Get timeline stages
    const { data: timeline, error: timelineError } = await supabaseAdmin
      .from("project_timelines")
      .select("*")
      .eq("project_id", project.id)
      .order("stage_order", { ascending: true });

    if (timelineError) {
      console.error("Timeline fetch error:", timelineError);
      return { project, timeline: [], stats: null };
    }

    // Calculate stats
    const stages = timeline || [];
    const completedStages = stages.filter(
      (stage) => stage.status === "completed"
    );
    const stats: TimelineStats = {
      total_stages: stages.length,
      completed_stages: completedStages.length,
      total_planned_cost: stages.reduce(
        (sum, stage) => sum + stage.planned_cost,
        0
      ),
      total_actual_cost: completedStages.reduce(
        (sum, stage) => sum + (stage.actual_cost || 0),
        0
      ),
      completion_percentage:
        stages.length > 0 ? (completedStages.length / stages.length) * 100 : 0,
    };

    return { project, timeline: stages, stats };
  } catch (error) {
    console.error("Error fetching project timeline:", error);
    return { project: null, timeline: [], stats: null };
  }
}

export async function getProjectBySlug(slug: string) {
  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("id, status")
    .eq("slug", slug)
    .single();

  if (error || !project) {
    return { error: "Project not found", data: null };
  }
  return { error: null, data: project };
}

type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in";

type Filter = {
  column: string;
  operator: FilterOperator;
  value: any;
};

export async function getProjectTimelineById(projectId: string) {
  if (!projectId?.trim()) {
    return { data: null, error: "Project ID is required" };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("project_timelines")
      .select("*")
      .eq("project_id", projectId.trim())
      .is("actual_cost", null)
      .order("stage_order, status", { ascending: true });

    if (error) {
      console.error("Timeline fetch error:", error.message);
      return {
        data: null,
        error: "Failed to fetch project timeline",
        details: error.message
      };
    }

    return { data: data || [], error: null };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected timeline error:", message);
    
    return {
      data: null,
      error: "An unexpected error occurred",
      details: message
    };
  }
}

export async function createProjectTimeline(
  projectSlug: string,
  stages: CreateTimelineStageData[]
): Promise<{ success: boolean; timeline?: TimelineStage[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Check admin permissions
    const role = await getUserRoleFromClerk(userId);
    if (!isAuthorized(role, "moderator")) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, status")
      .eq("slug", projectSlug)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    // Check if project is in active status
    if (project.status !== "active") {
      return {
        success: false,
        error: "Timeline can only be created for active projects",
      };
    }

    // Check if timeline already exists
    const { data: existingTimeline } = await supabaseAdmin
      .from("project_timelines")
      .select("id")
      .eq("project_id", project.id)
      .limit(1);

    if (existingTimeline && existingTimeline.length > 0) {
      return {
        success: false,
        error: "Timeline already exists for this project",
      };
    }

    // Prepare timeline data
    const timelineData = stages.map((stage, index) => ({
      project_id: project.id,
      title: stage.title,
      description: stage.description || null,
      planned_cost: stage.planned_cost,
      stage_order: index + 1,
      status: "pending" as const,
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
      return { success: false, error: "Failed to create timeline" };
    }

    // Revalidate the project page
    revalidatePath(`/projects/${projectSlug}`);

    return { success: true, timeline: timeline as TimelineStage[] };
  } catch (error) {
    console.error("Error creating timeline:", error);
    return { success: false, error: "Internal server error" };
  }
}

export async function completeTimelineStage(
  projectSlug: string,
  stageId: string,
  completionData: CompleteStageData
): Promise<{ success: boolean; stage?: TimelineStage; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Check admin permissions
    const role = await getUserRoleFromClerk(userId);
    if (!isAuthorized(role, "moderator")) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("slug", projectSlug)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    // Get current stage
    const { data: currentStage, error: stageError } = await supabaseAdmin
      .from("project_timelines")
      .select("*")
      .eq("id", stageId)
      .eq("project_id", project.id)
      .single();

    if (stageError || !currentStage) {
      return { success: false, error: "Timeline stage not found" };
    }

    // Check if stage is already completed
    if (currentStage.status === "completed") {
      return { success: false, error: "Stage is already completed" };
    }

    // Check if previous stages are completed (sequential completion)
    if (currentStage.stage_order > 1) {
      const { data: previousStages, error: prevError } = await supabaseAdmin
        .from("project_timelines")
        .select("status")
        .eq("project_id", project.id)
        .lt("stage_order", currentStage.stage_order)
        .neq("status", "completed");

      if (prevError) {
        console.error("Previous stages check error:", prevError);
        return { success: false, error: "Failed to validate stage sequence" };
      }

      if (previousStages && previousStages.length > 0) {
        return {
          success: false,
          error: "Previous stages must be completed first",
        };
      }
    }

    // Update stage to completed
    const updateData: any = {
      status: "completed",
      actual_cost: completionData.actual_cost || null,
      completion_notes: completionData.completion_notes || null,
      completion_media_urls: completionData.completion_media_urls || [],
      actual_end_date:
        completionData.actual_end_date || new Date().toISOString(),
      completed_by: userId,
      updated_at: new Date().toISOString(),
    };

    // Set actual start date if not already set
    if (!currentStage.actual_start_date) {
      updateData.actual_start_date = new Date().toISOString();
    }

    const { data: updatedStage, error: updateError } = await supabaseAdmin
      .from("project_timelines")
      .update(updateData)
      .eq("id", stageId)
      .select("*")
      .single();

    if (updateError) {
      console.error("Stage update error:", updateError);
      return { success: false, error: "Failed to complete stage" };
    }

    // Update project current_amount and status
    const { data: allStages, error: allStagesError } = await supabaseAdmin
      .from("project_timelines")
      .select("status, actual_cost")
      .eq("project_id", project.id)
      .order("stage_order", { ascending: true });

    if (!allStagesError && allStages) {
      const completedStages = allStages.filter(
        (stage) => stage.status === "completed"
      );
      const totalSpent = completedStages.reduce(
        (sum, stage) =>
          sum + (parseFloat(stage.actual_cost?.toString() || "0") || 0),
        0
      );

      // Update project current_amount with total spent
      await supabaseAdmin
        .from("projects")
        .update({ current_amount: totalSpent })
        .eq("id", project.id);

      // If all stages are completed, mark project as completed
      if (completedStages.length === allStages.length) {
        await supabaseAdmin
          .from("projects")
          .update({ status: "completed" })
          .eq("id", project.id);
      }
    }

    // Revalidate the project page
    revalidatePath(`/projects/${projectSlug}`);

    return { success: true, stage: updatedStage as TimelineStage };
  } catch (error) {
    console.error("Error completing stage:", error);
    return { success: false, error: "Internal server error" };
  }
}

export async function updateTimelineStage(
  projectSlug: string,
  stageId: string,
  updateData: Partial<CreateTimelineStageData>
): Promise<{ success: boolean; stage?: TimelineStage; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Check admin permissions
    const role = await getUserRoleFromClerk(userId);
    if (!isAuthorized(role, "moderator")) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("slug", projectSlug)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    // Update stage
    const { data: updatedStage, error: updateError } = await supabaseAdmin
      .from("project_timelines")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stageId)
      .eq("project_id", project.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Stage update error:", updateError);
      return { success: false, error: "Failed to update stage" };
    }

    // Revalidate the project page
    revalidatePath(`/projects/${projectSlug}`);

    return { success: true, stage: updatedStage as TimelineStage };
  } catch (error) {
    console.error("Error updating stage:", error);
    return { success: false, error: "Internal server error" };
  }
}

export async function deleteTimelineStage(
  projectSlug: string,
  stageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Check admin permissions
    const role = await getUserRoleFromClerk(userId);
    if (!isAuthorized(role, "moderator")) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("slug", projectSlug)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found" };
    }

    // Check if stage exists and is not completed
    const { data: stage, error: stageError } = await supabaseAdmin
      .from("project_timelines")
      .select("status, stage_order")
      .eq("id", stageId)
      .eq("project_id", project.id)
      .single();

    if (stageError || !stage) {
      return { success: false, error: "Timeline stage not found" };
    }

    if (stage.status === "completed") {
      return { success: false, error: "Cannot delete completed stages" };
    }

    // Delete stage
    const { error: deleteError } = await supabaseAdmin
      .from("project_timelines")
      .delete()
      .eq("id", stageId)
      .eq("project_id", project.id);

    if (deleteError) {
      console.error("Stage delete error:", deleteError);
      return { success: false, error: "Failed to delete stage" };
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

    // Revalidate the project page
    revalidatePath(`/projects/${projectSlug}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting stage:", error);
    return { success: false, error: "Internal server error" };
  }
}
