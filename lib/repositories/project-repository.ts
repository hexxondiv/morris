import type { Prisma, Project } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  dec,
  eventStatusToApi,
  eventTypeToApi,
  projectStageStatusToApi,
  projectStatusToApi,
  apiStatusesToPrisma,
} from "@/lib/repositories/mappers";

export type ProjectListParams = {
  page: number;
  limit: number;
  statuses: string[];
  search?: string;
  includeHidden: boolean;
  paginate: boolean;
  sortBy: "created_at" | "updated_at" | "title" | "current_amount";
  sortOrder: "asc" | "desc";
};

function orderByForList(
  sortBy: ProjectListParams["sortBy"],
  sortOrder: "asc" | "desc"
): Prisma.ProjectOrderByWithRelationInput {
  switch (sortBy) {
    case "title":
      return { title: sortOrder };
    case "updated_at":
      return { updatedAt: sortOrder };
    case "current_amount":
      return { currentAmount: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

export async function listProjects(params: ProjectListParams) {
  let statuses = params.statuses;
  if (!params.includeHidden) {
    statuses = statuses.filter((s) => s !== "draft");
  }
  const prismaStatuses =
    statuses.length > 0 ? apiStatusesToPrisma(statuses) : undefined;

  const where: Prisma.ProjectWhereInput = {};
  if (prismaStatuses?.length) {
    where.status = { in: prismaStatuses };
  }
  if (params.search && params.search.length >= 2) {
    where.OR = [
      { title: { contains: params.search } },
      { description: { contains: params.search } },
    ];
  }

  const orderBy = orderByForList(params.sortBy, params.sortOrder);

  const skip = params.paginate ? (params.page - 1) * params.limit : undefined;
  const take = params.paginate ? params.limit : undefined;

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      skip: skip ?? 0,
      take: take ?? undefined,
      }),
    prisma.project.count({ where }),
  ]);

  return { rows: rows.map(mapProjectListRow), total };
}

function mapProjectListRow(p: Prisma.ProjectGetPayload<object>) {
  return {
    id: p.id,
    creator_id: p.creatorId,
    slug: p.slug,
    title: p.title,
    description: p.description,
    body_html: p.bodyHtml,
    goal_amount: dec(p.goalAmount),
    current_amount: dec(p.currentAmount),
    currency: p.currency,
    status: projectStatusToApi(p.status),
    sector: p.sector,
    country: p.country,
    state: p.state,
    cover_image_url: p.coverImageUrl,
    featured_rank: p.featuredRank,
    published_at: p.publishedAt?.toISOString() ?? null,
    completed_at: p.completedAt?.toISOString() ?? null,
    cancelled_at: p.cancelledAt?.toISOString() ?? null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export function mapVotingPeriod(vp: {
  id: string;
  projectId: string;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: vp.id,
    project_id: vp.projectId,
    start_date: vp.startAt.toISOString(),
    end_date: vp.endAt.toISOString(),
    created_at: vp.createdAt.toISOString(),
    updated_at: vp.updatedAt.toISOString(),
  };
}

export async function getProjectByInternalId(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: { votingPeriod: true },
  });
}

export async function getProjectBySlugOrId(slugOrId: string) {
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slugOrId
    );
  if (isUUID) {
    return prisma.project.findUnique({
      where: { id: slugOrId },
      include: {
        votingPeriod: true,
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
  }
  return prisma.project.findUnique({
    where: { slug: slugOrId },
    include: {
      votingPeriod: true,
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
}

export async function listEventsForProject(projectId: string) {
  const events = await prisma.event.findMany({
    where: { projectId },
    include: { project: { select: { title: true } } },
    orderBy: { startAt: "asc" },
  });
  return events.map((e) => ({
    id: e.id,
    creator_id: e.creatorId,
    title: e.title,
    description: e.description ?? "",
    project_id: e.projectId,
    project_title: e.project?.title ?? null,
    recording_url: e.recordingUrl,
    recording_password: e.recordingPassword,
    start_date: e.startAt.toISOString(),
    end_date: (e.endAt ?? e.startAt).toISOString(),
    location: e.location,
    status: eventStatusToApi(e.status),
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
    event_type: eventTypeToApi(e.eventType),
  }));
}

export function mapTimelineStages(
  projectId: string,
  stages: Array<{
    id: string;
    timelineId: string;
    title: string;
    description: string | null;
    plannedCost: Prisma.Decimal;
    actualCost: Prisma.Decimal | null;
    stageOrder: number;
    status: import("@prisma/client").ProjectStageStatus;
    plannedStartDate: Date | null;
    plannedEndDate: Date | null;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
    completionNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null;
    completedById: string | null;
    media: Array<{
      kind: import("@prisma/client").ProjectStageMediaKind;
      publicUrl: string | null;
    }>;
  }>
) {
  return stages.map((s) => {
    const mediaUrls = s.media
      .filter((m) => m.kind === "PLANNED")
      .map((m) => m.publicUrl)
      .filter(Boolean) as string[];
    const completionMediaUrls = s.media
      .filter((m) => m.kind === "COMPLETION")
      .map((m) => m.publicUrl)
      .filter(Boolean) as string[];
    return {
      id: s.id,
      project_id: projectId,
      title: s.title,
      description: s.description ?? undefined,
      planned_cost: dec(s.plannedCost),
      actual_cost: s.actualCost != null ? dec(s.actualCost) : null,
      stage_order: s.stageOrder,
      status: projectStageStatusToApi(s.status) as
        | "pending"
        | "in_progress"
        | "completed",
      planned_start_date: s.plannedStartDate?.toISOString() ?? undefined,
      planned_end_date: s.plannedEndDate?.toISOString() ?? undefined,
      actual_start_date: s.actualStartDate?.toISOString() ?? undefined,
      actual_end_date: s.actualEndDate?.toISOString() ?? undefined,
      completion_notes: s.completionNotes ?? undefined,
      media_urls: mediaUrls,
      completion_media_urls: completionMediaUrls,
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
      created_by: s.createdById,
      completed_by: s.completedById,
    };
  });
}

type ProjectDetailLike = Project & {
  votingPeriod: {
    id: string;
    projectId: string;
    startAt: Date;
    endAt: Date;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

export function mapProjectDetailRow(p: ProjectDetailLike) {
  return {
    id: p.id,
    creator_id: p.creatorId,
    slug: p.slug,
    title: p.title,
    description: p.description,
    body_html: p.bodyHtml,
    goal_amount: dec(p.goalAmount),
    current_amount: dec(p.currentAmount),
    currency: p.currency,
    status: projectStatusToApi(p.status),
    sector: p.sector,
    country: p.country,
    state: p.state,
    cover_image_url: p.coverImageUrl,
    featured_rank: p.featuredRank,
    published_at: p.publishedAt?.toISOString() ?? null,
    completed_at: p.completedAt?.toISOString() ?? null,
    cancelled_at: p.cancelledAt?.toISOString() ?? null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
    voting_periods: p.votingPeriod ? mapVotingPeriod(p.votingPeriod) : null,
  };
}

export type ProjectApiPatchInput = {
  title?: string;
  description?: string;
  goal_amount?: number;
  status?: string;
  state?: string | null;
  country?: string | null;
  sector?: string | null;
  body_html?: string | null;
  /** Public cover URL from `/api/upload-image` (maps to `coverImageUrl`). */
  cover_image?: string | null;
  current_amount?: number;
  slug?: string;
  creator_id?: string;
};

export async function updateProjectBySlugOrId(
  slugOrId: string,
  data: ProjectApiPatchInput
) {
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slugOrId
    );
  const where = isUUID ? { id: slugOrId } : { slug: slugOrId };

  const prismaData: Prisma.ProjectUncheckedUpdateInput = {};
  if (data.title !== undefined) prismaData.title = data.title;
  if (data.description !== undefined) prismaData.description = data.description;
  if (data.goal_amount !== undefined)
    prismaData.goalAmount = data.goal_amount;
  if (data.current_amount !== undefined)
    prismaData.currentAmount = data.current_amount;
  if (data.status !== undefined) {
    const mapped = apiStatusesToPrisma([data.status]);
    if (mapped[0]) prismaData.status = mapped[0];
  }
  if (data.state !== undefined) prismaData.state = data.state;
  if (data.country !== undefined) prismaData.country = data.country;
  if (data.sector !== undefined) prismaData.sector = data.sector;
  if (data.body_html !== undefined) prismaData.bodyHtml = data.body_html;
  if (data.cover_image !== undefined)
    prismaData.coverImageUrl = data.cover_image;
  if (data.slug !== undefined) prismaData.slug = data.slug;
  if (data.creator_id !== undefined) prismaData.creatorId = data.creator_id;

  const updated = await prisma.project.update({
    where,
    data: prismaData,
  });
  return mapProjectDetailRow({ ...updated, votingPeriod: null });
}

export async function isProjectSlugTaken(
  slug: string,
  excludeProjectId?: string
): Promise<boolean> {
  const existing = await prisma.project.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!existing) return false;
  if (excludeProjectId && existing.id === excludeProjectId) return false;
  return true;
}

export type CreateProjectInput = {
  creatorId: string;
  slug: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  status: string;
  state: string | null;
  country: string | null;
  sector: string | null;
  bodyHtml: string | null;
  coverImageUrl: string | null;
};

export async function createProjectRecord(input: CreateProjectInput) {
  const mapped = apiStatusesToPrisma([input.status]);
  const status = mapped[0];
  if (!status) {
    throw new Error(`Invalid project status: ${input.status}`);
  }

  return prisma.project.create({
    data: {
      creatorId: input.creatorId,
      slug: input.slug,
      title: input.title,
      description: input.description,
      bodyHtml: input.bodyHtml,
      goalAmount: input.goalAmount,
      currentAmount: input.currentAmount,
      currency: "NGN",
      status,
      sector: input.sector,
      country: input.country,
      state: input.state,
      coverImageUrl: input.coverImageUrl,
    },
  });
}

/**
 * Keeps `voting_periods` aligned with project status and optional window dates.
 */
export async function syncProjectVotingPeriodByStatus(params: {
  projectId: string;
  apiStatus: string;
  startDateIso?: string | null;
  endDateIso?: string | null;
}) {
  const { projectId, apiStatus, startDateIso, endDateIso } = params;

  if (apiStatus === "voting" && startDateIso && endDateIso) {
    const startAt = new Date(startDateIso);
    const endAt = new Date(endDateIso);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new Error("Invalid voting period dates");
    }

    await prisma.votingPeriod.upsert({
      where: { projectId },
      create: {
        projectId,
        startAt,
        endAt,
      },
      update: {
        startAt,
        endAt,
      },
    });
    return;
  }

  await prisma.votingPeriod.deleteMany({ where: { projectId } });
}
