import type { Prisma } from "@prisma/client";
import {
  PledgeInterval,
  PledgeStatus,
  PledgeType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
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
