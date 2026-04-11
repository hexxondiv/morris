"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { projectStatusToApi } from "@/lib/repositories/mappers";
import { getPrimaryRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/server";
import { isAuthorized } from "@/lib/utils";
import {
  completeTimelineStage as completeTimelineStageTx,
  createTimelineStages,
  deleteTimelineStage as deleteTimelineStageTx,
  getTimelinePayloadForSlug,
  getTimelineStagesForProjectId,
  updateTimelineStage as updateTimelineStageTx,
} from "@/lib/services/timeline-service";
import {
  TimelineStage,
  TimelineStats,
  CreateTimelineStageData,
  CompleteStageData,
} from "@/types/timeline";

async function requireModeratorSession() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: { select: { key: true } } } },
    },
  });
  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const role = getPrimaryRole(user.userRoles);
  if (!isAuthorized(role, "moderator")) {
    return { ok: false as const, error: "Insufficient permissions" };
  }
  return { ok: true as const, userId };
}

export async function getProjectTimeline(projectSlug: string): Promise<{
  project: { id: string; status: string } | null;
  timeline: TimelineStage[];
  stats: TimelineStats | null;
}> {
  try {
    return await getTimelinePayloadForSlug(projectSlug);
  } catch (error) {
    console.error("Error fetching project timeline:", error);
    return { project: null, timeline: [], stats: null };
  }
}

export async function getProjectBySlug(slug: string) {
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  if (!project) {
    return { error: "Project not found", data: null };
  }
  return {
    error: null,
    data: {
      id: project.id,
      status: projectStatusToApi(project.status),
    },
  };
}

export async function getProjectTimelineById(projectId: string) {
  if (!projectId?.trim()) {
    return { data: null, error: "Project ID is required" };
  }
  try {
    return await getTimelineStagesForProjectId(projectId.trim());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected timeline error:", message);
    return {
      data: null,
      error: "An unexpected error occurred",
      details: message,
    };
  }
}

export async function createProjectTimeline(
  projectSlug: string,
  stages: CreateTimelineStageData[]
): Promise<{ success: boolean; timeline?: TimelineStage[]; error?: string }> {
  const gate = await requireModeratorSession();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const result = await createTimelineStages(projectSlug, stages, gate.userId);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/projects/${projectSlug}`);
  return { success: true, timeline: result.timeline };
}

export async function completeTimelineStage(
  projectSlug: string,
  stageId: string,
  completionData: CompleteStageData
): Promise<{ success: boolean; stage?: TimelineStage; error?: string }> {
  const gate = await requireModeratorSession();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const result = await completeTimelineStageTx(
    projectSlug,
    stageId,
    completionData,
    gate.userId
  );
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/projects/${projectSlug}`);
  return { success: true, stage: result.stage };
}

export async function updateTimelineStage(
  projectSlug: string,
  stageId: string,
  updateData: Partial<CreateTimelineStageData>
): Promise<{ success: boolean; stage?: TimelineStage; error?: string }> {
  const gate = await requireModeratorSession();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const result = await updateTimelineStageTx(projectSlug, stageId, updateData);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/projects/${projectSlug}`);
  return { success: true, stage: result.stage };
}

export async function deleteTimelineStage(
  projectSlug: string,
  stageId: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireModeratorSession();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const result = await deleteTimelineStageTx(projectSlug, stageId);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/projects/${projectSlug}`);
  return { success: true };
}
