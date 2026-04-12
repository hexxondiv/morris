import type { Prisma } from "@prisma/client";
import { PledgeInterval, PledgeStatus, PledgeType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { capitalize } from "lodash";
import { dec } from "@/lib/repositories/mappers";

const pledgeExportInclude = {
  user: { select: { email: true, firstName: true, lastName: true } },
  project: { select: { title: true } },
} satisfies Prisma.PledgeInclude;

export type PledgeExportFilters = {
  globalFilter: string;
  statusFilter: string;
  pledgeTypeFilter: string;
  recurrenceIntervalFilter: string;
};

function parsePledgeStatus(s: string): PledgeStatus | undefined {
  const u = s.toUpperCase() as PledgeStatus;
  return Object.values(PledgeStatus).includes(u) ? u : undefined;
}

function parsePledgeType(s: string): PledgeType | undefined {
  const v = s.toLowerCase();
  if (v === "one_time" || v === "one-time") return PledgeType.ONE_TIME;
  if (v === "recurring") return PledgeType.RECURRING;
  return undefined;
}

function parseInterval(s: string): PledgeInterval | undefined {
  const u = s.toUpperCase() as PledgeInterval;
  return Object.values(PledgeInterval).includes(u) ? u : undefined;
}

export async function listPledgesForExport(filters: PledgeExportFilters) {
  const where: Prisma.PledgeWhereInput = {};

  if (filters.statusFilter) {
    const st = parsePledgeStatus(filters.statusFilter);
    if (st) where.status = st;
  }
  if (filters.pledgeTypeFilter) {
    const pt = parsePledgeType(filters.pledgeTypeFilter);
    if (pt) where.pledgeType = pt;
  }
  if (filters.recurrenceIntervalFilter) {
    const iv = parseInterval(filters.recurrenceIntervalFilter);
    if (iv) where.recurrenceInterval = iv;
  }

  if (filters.globalFilter) {
    const g = filters.globalFilter;
    const st = parsePledgeStatus(g);
    where.OR = [
      ...(st ? [{ status: st }] : []),
      {
        user: {
          OR: [
            { email: { contains: g } },
            { firstName: { contains: g } },
            { lastName: { contains: g } },
          ],
        },
      },
      { project: { title: { contains: g } } },
      { donorEmail: { contains: g } },
      { donorName: { contains: g } },
    ];
  }

  return prisma.pledge.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: pledgeExportInclude,
  });
}

export type PledgeAdminListParams = {
  pageIndex: number;
  pageSize: number;
  globalFilter: string;
  statusFilter: string;
  pledgeTypeFilter: string;
  recurrenceIntervalFilter: string;
  dateFrom: string | null;
  dateTo: string | null;
  dateField: "created_at" | "updated_at";
};

function pledgeDateField(
  f: PledgeAdminListParams["dateField"]
): "createdAt" | "updatedAt" {
  return f === "updated_at" ? "updatedAt" : "createdAt";
}

function buildPledgeAdminWhere(
  params: Omit<PledgeAdminListParams, "pageIndex" | "pageSize">
): Prisma.PledgeWhereInput {
  const filters: PledgeExportFilters = {
    globalFilter: params.globalFilter,
    statusFilter: params.statusFilter,
    pledgeTypeFilter: params.pledgeTypeFilter,
    recurrenceIntervalFilter: params.recurrenceIntervalFilter,
  };
  const where: Prisma.PledgeWhereInput = {};

  if (filters.statusFilter) {
    const st = parsePledgeStatus(filters.statusFilter);
    if (st) where.status = st;
  }
  if (filters.pledgeTypeFilter) {
    const pt = parsePledgeType(filters.pledgeTypeFilter);
    if (pt) where.pledgeType = pt;
  }
  if (filters.recurrenceIntervalFilter) {
    const iv = parseInterval(filters.recurrenceIntervalFilter);
    if (iv) where.recurrenceInterval = iv;
  }

  if (filters.globalFilter) {
    const g = filters.globalFilter;
    const st = parsePledgeStatus(g);
    where.OR = [
      ...(st ? [{ status: st }] : []),
      {
        user: {
          OR: [
            { email: { contains: g } },
            { firstName: { contains: g } },
            { lastName: { contains: g } },
          ],
        },
      },
      { project: { title: { contains: g } } },
      { donorEmail: { contains: g } },
      { donorName: { contains: g } },
    ];
  }

  const df = pledgeDateField(params.dateField);
  const range: Prisma.DateTimeFilter = {};
  if (params.dateFrom) range.gte = new Date(params.dateFrom);
  if (params.dateTo) range.lte = new Date(params.dateTo);
  if (Object.keys(range).length) {
    where[df] = range;
  }

  return where;
}

export async function listPledgesForAdmin(params: PledgeAdminListParams) {
  const where = buildPledgeAdminWhere(params);
  const skip = params.pageIndex * params.pageSize;
  const take = params.pageSize;
  const orderField = pledgeDateField(params.dateField);

  const [rows, total] = await Promise.all([
    prisma.pledge.findMany({
      where,
      skip,
      take,
      orderBy: { [orderField]: "desc" },
      include: pledgeExportInclude,
    }),
    prisma.pledge.count({ where }),
  ]);

  return { rows, total };
}

export function mapPledgeAdminTableRow(
  p: Prisma.PledgeGetPayload<{ include: typeof pledgeExportInclude }>
) {
  return {
    id: p.id,
    user_id: p.userId ?? "",
    user_email: p.user?.email ?? "Unknown",
    full_name: p.user
      ? `${capitalize(p.user.firstName ?? "")} ${capitalize(p.user.lastName ?? "")}`.trim() ||
        "Unknown"
      : "Unknown",
    project_id: p.projectId,
    project_title: p.project?.title ?? null,
    amount: dec(p.amount),
    pledge_type: p.pledgeType.toLowerCase(),
    recurrence_interval: p.recurrenceInterval?.toLowerCase() ?? null,
    payment_day: p.paymentDay?.toLowerCase() ?? null,
    status: p.status.toLowerCase(),
    created_at: p.createdAt.toISOString(),
  };
}

export function mapPledgeExportRow(
  p: Prisma.PledgeGetPayload<{ include: typeof pledgeExportInclude }>
) {
  return {
    id: p.id,
    user_id: p.userId,
    project_id: p.projectId,
    amount: dec(p.amount),
    pledge_type: p.pledgeType.toLowerCase(),
    recurrence_interval: p.recurrenceInterval?.toLowerCase() ?? null,
    payment_day: p.paymentDay?.toLowerCase() ?? null,
    status: p.status.toLowerCase(),
    created_at: p.createdAt.toISOString(),
    profiles: p.user
      ? {
          email: p.user.email,
          first_name: p.user.firstName,
          last_name: p.user.lastName,
        }
      : null,
    projects: p.project ? { title: p.project.title } : null,
  };
}
