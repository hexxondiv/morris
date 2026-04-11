import {
  Prisma,
  ProjectStageMediaKind,
  ProjectStageStatus,
  ProjectStatus,
  TimelineStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { mapTimelineStages } from "@/lib/repositories/project-repository";
import { dec, projectStatusToApi } from "@/lib/repositories/mappers";
import type {
  CompleteStageData,
  CreateTimelineStageData,
  TimelineStage,
  TimelineStats,
} from "@/types/timeline";

export async function getTimelinePayloadForSlug(slug: string): Promise<{
  project: { id: string; status: string } | null;
  timeline: TimelineStage[];
  stats: TimelineStats | null;
}> {
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      timeline: {
        include: {
          stages: {
            orderBy: { stageOrder: "asc" },
            include: { media: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });

  if (!project) {
    return { project: null, timeline: [], stats: null };
  }

  const stages = project.timeline?.stages ?? [];
  const timeline = mapTimelineStages(project.id, stages) as TimelineStage[];
  const completedStages = timeline.filter((s) => s.status === "completed");
  const stats: TimelineStats = {
    total_stages: timeline.length,
    completed_stages: completedStages.length,
    total_planned_cost: timeline.reduce((sum, s) => sum + s.planned_cost, 0),
    total_actual_cost: completedStages.reduce(
      (sum, s) => sum + (s.actual_cost ?? 0),
      0
    ),
    completion_percentage:
      timeline.length > 0
        ? (completedStages.length / timeline.length) * 100
        : 0,
  };

  return {
    project: { id: project.id, status: projectStatusToApi(project.status) },
    timeline,
    stats,
  };
}

export async function getTimelineStagesForProjectId(projectId: string) {
  const timeline = await prisma.projectTimeline.findUnique({
    where: { projectId },
    include: {
      stages: {
        where: { status: { not: ProjectStageStatus.COMPLETED } },
        orderBy: [{ stageOrder: "asc" }, { status: "asc" }],
        include: { media: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!timeline) return { data: [], error: null as string | null };
  return {
    data: mapTimelineStages(projectId, timeline.stages),
    error: null as string | null,
  };
}

async function attachPlannedMedia(
  tx: Prisma.TransactionClient,
  stageId: string,
  urls: string[] | undefined
) {
  if (!urls?.length) return;
  let sort = 0;
  for (const url of urls) {
    await tx.projectStageMedia.create({
      data: {
        stageId,
        kind: ProjectStageMediaKind.PLANNED,
        storageKey: `legacy-url:${stageId}:${sort}`,
        publicUrl: url,
        sortOrder: sort++,
      },
    });
  }
}

export async function createTimelineStages(
  slug: string,
  stages: CreateTimelineStageData[],
  creatorId: string | null
): Promise<{ success: true; timeline: TimelineStage[] } | { success: false; error: string }> {
  try {
    const createdStages = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });
      if (!project) {
        throw new Error("NOT_FOUND");
      }
      if (project.status !== ProjectStatus.ACTIVE) {
        throw new Error("NOT_ACTIVE");
      }

      const existingTimeline = await tx.projectTimeline.findUnique({
        where: { projectId: project.id },
      });
      if (existingTimeline) {
        const count = await tx.projectStage.count({
          where: { timelineId: existingTimeline.id },
        });
        if (count > 0) {
          throw new Error("TIMELINE_EXISTS");
        }
      }

      const timelineRow =
        existingTimeline ??
        (await tx.projectTimeline.create({
          data: {
            projectId: project.id,
            createdById: creatorId,
            status: TimelineStatus.ACTIVE,
          },
        }));

      const created: TimelineStage[] = [];
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        const stage = await tx.projectStage.create({
          data: {
            timelineId: timelineRow.id,
            title: s.title,
            description: s.description ?? null,
            plannedCost: s.planned_cost,
            stageOrder: i + 1,
            status: ProjectStageStatus.PENDING,
            plannedStartDate: s.planned_start_date
              ? new Date(s.planned_start_date)
              : null,
            plannedEndDate: s.planned_end_date
              ? new Date(s.planned_end_date)
              : null,
            createdById: creatorId,
          },
        });
        await attachPlannedMedia(tx, stage.id, s.media_urls);
        const full = await tx.projectStage.findUniqueOrThrow({
          where: { id: stage.id },
          include: { media: { orderBy: { sortOrder: "asc" } } },
        });
        created.push(
          ...(mapTimelineStages(project.id, [full]) as TimelineStage[])
        );
      }

      return created.sort((a, b) => a.stage_order - b.stage_order);
    });

    return { success: true, timeline: createdStages };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return { success: false, error: "Project not found" };
    }
    if (msg === "NOT_ACTIVE") {
      return {
        success: false,
        error: "Timeline can only be created for active projects",
      };
    }
    if (msg === "TIMELINE_EXISTS") {
      return {
        success: false,
        error: "Timeline already exists for this project",
      };
    }
    console.error("createTimelineStages:", e);
    return { success: false, error: "Failed to create timeline" };
  }
}

export async function completeTimelineStage(
  slug: string,
  stageId: string,
  completionData: CompleteStageData,
  completedById: string | null
): Promise<
  { success: true; stage: TimelineStage } | { success: false; error: string }
> {
  try {
    const stage = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!project) {
        throw new Error("NOT_FOUND");
      }

      const current = await tx.projectStage.findFirst({
        where: { id: stageId, timeline: { projectId: project.id } },
        include: { timeline: true },
      });

      if (!current) {
        throw new Error("NO_STAGE");
      }

      if (current.status === ProjectStageStatus.COMPLETED) {
        throw new Error("ALREADY_DONE");
      }

      if (current.stageOrder > 1) {
        const incomplete = await tx.projectStage.count({
          where: {
            timelineId: current.timelineId,
            stageOrder: { lt: current.stageOrder },
            status: { not: ProjectStageStatus.COMPLETED },
          },
        });
        if (incomplete > 0) {
          throw new Error("SEQ");
        }
      }

      const rawCost = completionData.actual_cost;
      const actualCost =
        rawCost === undefined || rawCost === null || rawCost === ""
          ? null
          : parseFloat(String(rawCost));

      const updated = await tx.projectStage.update({
        where: { id: stageId },
        data: {
          status: ProjectStageStatus.COMPLETED,
          actualCost,
          completionNotes: completionData.completion_notes ?? null,
          actualEndDate: completionData.actual_end_date
            ? new Date(completionData.actual_end_date)
            : new Date(),
          completedById,
          actualStartDate: current.actualStartDate ?? new Date(),
        },
        include: { media: { orderBy: { sortOrder: "asc" } } },
      });

      if (completionData.completion_media_urls?.length) {
        await tx.projectStageMedia.deleteMany({
          where: {
            stageId,
            kind: ProjectStageMediaKind.COMPLETION,
          },
        });
        let sort = 0;
        for (const url of completionData.completion_media_urls) {
          await tx.projectStageMedia.create({
            data: {
              stageId,
              kind: ProjectStageMediaKind.COMPLETION,
              storageKey: `legacy-completion:${stageId}:${sort}`,
              publicUrl: url,
              sortOrder: sort++,
            },
          });
        }
      }

      const allStages = await tx.projectStage.findMany({
        where: { timelineId: current.timelineId },
        orderBy: { stageOrder: "asc" },
      });

      const completed = allStages.filter(
        (s) => s.status === ProjectStageStatus.COMPLETED
      );
      const totalSpent = completed.reduce(
        (sum, s) => sum + dec(s.actualCost),
        0
      );

      await tx.project.update({
        where: { id: project.id },
        data: {
          currentAmount: totalSpent,
          ...(completed.length === allStages.length
            ? { status: ProjectStatus.COMPLETED, completedAt: new Date() }
            : {}),
        },
      });

      const withMedia = await tx.projectStage.findUniqueOrThrow({
        where: { id: updated.id },
        include: { media: { orderBy: { sortOrder: "asc" } } },
      });

      return mapTimelineStages(project.id, [withMedia])[0] as TimelineStage;
    });

    return { success: true, stage };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND")
      return { success: false, error: "Project not found" };
    if (msg === "NO_STAGE")
      return { success: false, error: "Timeline stage not found" };
    if (msg === "ALREADY_DONE")
      return { success: false, error: "Stage is already completed" };
    if (msg === "SEQ")
      return {
        success: false,
        error: "Previous stages must be completed first",
      };
    console.error("completeTimelineStage:", e);
    return { success: false, error: "Internal server error" };
  }
}

export async function updateTimelineStage(
  slug: string,
  stageId: string,
  update: Partial<CreateTimelineStageData>
): Promise<
  { success: true; stage: TimelineStage } | { success: false; error: string }
> {
  try {
    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!project) {
      return { success: false, error: "Project not found" };
    }

    const existing = await prisma.projectStage.findFirst({
      where: { id: stageId, timeline: { projectId: project.id } },
    });
    if (!existing) {
      return { success: false, error: "Timeline stage not found" };
    }

    const data: Prisma.ProjectStageUpdateInput = {};
    if (update.title !== undefined) data.title = update.title;
    if (update.description !== undefined) data.description = update.description;
    if (update.planned_cost !== undefined)
      data.plannedCost = update.planned_cost;
    if (update.planned_start_date !== undefined) {
      data.plannedStartDate = update.planned_start_date
        ? new Date(update.planned_start_date)
        : null;
    }
    if (update.planned_end_date !== undefined) {
      data.plannedEndDate = update.planned_end_date
        ? new Date(update.planned_end_date)
        : null;
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectStage.update({
        where: { id: stageId },
        data,
      });

      if (update.media_urls) {
        await tx.projectStageMedia.deleteMany({
          where: {
            stageId,
            kind: ProjectStageMediaKind.PLANNED,
          },
        });
        await attachPlannedMedia(tx, stageId, update.media_urls);
      }
    });

    const refreshed = await prisma.projectStage.findUniqueOrThrow({
      where: { id: stageId },
      include: { media: { orderBy: { sortOrder: "asc" } } },
    });

    return {
      success: true,
      stage: mapTimelineStages(project.id, [refreshed])[0] as TimelineStage,
    };
  } catch {
    return { success: false, error: "Failed to update stage" };
  }
}

export async function deleteTimelineStage(
  slug: string,
  stageId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!project) {
        throw new Error("NOT_FOUND");
      }

      const stage = await tx.projectStage.findFirst({
        where: { id: stageId, timeline: { projectId: project.id } },
      });
      if (!stage) {
        throw new Error("NO_STAGE");
      }
      if (stage.status === ProjectStageStatus.COMPLETED) {
        throw new Error("BAD_STATUS");
      }

      const order = stage.stageOrder;

      await tx.projectStage.delete({ where: { id: stageId } });

      const remaining = await tx.projectStage.findMany({
        where: {
          timelineId: stage.timelineId,
          stageOrder: { gt: order },
        },
        orderBy: { stageOrder: "asc" },
      });

      for (let i = 0; i < remaining.length; i++) {
        await tx.projectStage.update({
          where: { id: remaining[i].id },
          data: { stageOrder: order + i },
        });
      }
    });

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND")
      return { success: false, error: "Project not found" };
    if (msg === "NO_STAGE")
      return { success: false, error: "Timeline stage not found" };
    if (msg === "BAD_STATUS")
      return { success: false, error: "Cannot delete completed stages" };
    return { success: false, error: "Failed to delete stage" };
  }
}

export async function replaceProjectTimeline(
  slug: string,
  rawStages: Array<{
    title: string;
    description?: string | null;
    planned_cost: number;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
    media_urls?: string[];
    stage_order?: number;
  }>,
  creatorId: string | null
): Promise<
  | { success: true; timeline: TimelineStage[]; message: string }
  | { success: false; error: string }
> {
  try {
    const timeline = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!project) throw new Error("NOT_FOUND");

      let timelineRow = await tx.projectTimeline.findUnique({
        where: { projectId: project.id },
        include: { stages: true },
      });

      if (!timelineRow) {
        timelineRow = await tx.projectTimeline.create({
          data: {
            projectId: project.id,
            createdById: creatorId,
            status: TimelineStatus.ACTIVE,
          },
          include: { stages: true },
        });
      }

      const existingStages = [...timelineRow.stages].sort(
        (a, b) => a.stageOrder - b.stageOrder
      );
      const completed = existingStages.filter(
        (s) => s.status === ProjectStageStatus.COMPLETED
      );
      const pending = existingStages.filter(
        (s) => s.status === ProjectStageStatus.PENDING
      );

      if (completed.length > 0) {
        if (pending.length) {
          await tx.projectStage.deleteMany({
            where: { id: { in: pending.map((p) => p.id) } },
          });
        }
        const nextOrder = completed.length + 1;
        for (let i = 0; i < rawStages.length; i++) {
          const st = rawStages[i];
          const planned = parseFloat(String(st.planned_cost)) || 0;
          const stage = await tx.projectStage.create({
            data: {
              timelineId: timelineRow.id,
              title: st.title,
              description: st.description ?? null,
              plannedCost: planned,
              stageOrder: nextOrder + i,
              status: ProjectStageStatus.PENDING,
              plannedStartDate: st.planned_start_date
                ? new Date(st.planned_start_date)
                : null,
              plannedEndDate: st.planned_end_date
                ? new Date(st.planned_end_date)
                : null,
              createdById: creatorId,
            },
          });
          await attachPlannedMedia(tx, stage.id, st.media_urls);
        }
      } else {
        await tx.projectStage.deleteMany({
          where: { timelineId: timelineRow.id },
        });
        for (let i = 0; i < rawStages.length; i++) {
          const st = rawStages[i];
          const planned = parseFloat(String(st.planned_cost)) || 0;
          const stage = await tx.projectStage.create({
            data: {
              timelineId: timelineRow.id,
              title: st.title,
              description: st.description ?? null,
              plannedCost: planned,
              stageOrder: st.stage_order ?? i + 1,
              status: ProjectStageStatus.PENDING,
              plannedStartDate: st.planned_start_date
                ? new Date(st.planned_start_date)
                : null,
              plannedEndDate: st.planned_end_date
                ? new Date(st.planned_end_date)
                : null,
              createdById: creatorId,
            },
          });
          await attachPlannedMedia(tx, stage.id, st.media_urls);
        }
      }

      const all = await tx.projectStage.findMany({
        where: { timelineId: timelineRow.id },
        orderBy: { stageOrder: "asc" },
        include: { media: { orderBy: { sortOrder: "asc" } } },
      });

      return mapTimelineStages(project.id, all) as TimelineStage[];
    });

    return {
      success: true,
      timeline,
      message: "Timeline updated successfully",
    };
  } catch (e) {
    console.error("replaceProjectTimeline:", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return { success: false, error: "Project not found" };
    }
    return { success: false, error: "Failed to update timeline" };
  }
}

export async function startTimelineStage(
  slug: string,
  stageId: string,
  _userId: string,
  opts: {
    transaction_amount?: number;
    transaction_notes?: string;
    transaction_ref?: string;
  }
): Promise<
  { success: true; stage: TimelineStage } | { success: false; error: string }
> {
  try {
    const stage = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!project) throw new Error("NOT_FOUND");

      const current = await tx.projectStage.findFirst({
        where: { id: stageId, timeline: { projectId: project.id } },
      });
      if (!current) throw new Error("NO_STAGE");

      if (
        current.status !== ProjectStageStatus.PENDING &&
        current.status !== ProjectStageStatus.IN_PROGRESS
      ) {
        throw new Error("BAD_STATE");
      }

      const all = await tx.projectStage.findMany({
        where: { timelineId: current.timelineId },
        select: { status: true },
      });
      const completedCount = all.filter(
        (s) => s.status === ProjectStageStatus.COMPLETED
      ).length;
      let inProgressCount = all.filter(
        (s) => s.status === ProjectStageStatus.IN_PROGRESS
      ).length;
      if (current.status === ProjectStageStatus.IN_PROGRESS) {
        inProgressCount -= 1;
      }
      const newOrder = completedCount + inProgressCount + 1;

      const updated = await tx.projectStage.update({
        where: { id: stageId },
        data: {
          status: ProjectStageStatus.IN_PROGRESS,
          stageOrder: newOrder,
          actualStartDate: new Date(),
          actualCost:
            opts.transaction_amount != null
              ? opts.transaction_amount
              : undefined,
        },
        include: { media: { orderBy: { sortOrder: "asc" } } },
      });

      return mapTimelineStages(project.id, [updated])[0] as TimelineStage;
    });

    return { success: true, stage };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND")
      return { success: false, error: "Project not found" };
    if (msg === "NO_STAGE")
      return { success: false, error: "Timeline stage not found" };
    if (msg === "BAD_STATE") {
      return {
        success: false,
        error: "Only pending in_progress stages can be started",
      };
    }
    return { success: false, error: "Failed to start stage" };
  }
}
