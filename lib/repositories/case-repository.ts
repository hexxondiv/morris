import type { Prisma } from "@prisma/client";
import { CaseStatus, HelpType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { caseStatusToApi, helpTypeToApi, reportingForToApi } from "@/lib/repositories/mappers";

const caseListInclude = {
  state: { select: { name: true } },
  lga: { select: { name: true } },
} satisfies Prisma.CaseInclude;

export type CaseListParams = {
  pageIndex: number;
  pageSize: number;
  globalFilter: string;
  statusFilter: string;
  helpTypeFilter: string;
  stateFilter: string;
  dateFrom: string | null;
  dateTo: string | null;
};

function parseHelpTypeApi(v: string): HelpType | undefined {
  const map: Record<string, HelpType> = {
    school_fees: HelpType.SCHOOL_FEES,
    educational_materials: HelpType.EDUCATIONAL_MATERIALS,
    infrastructure: HelpType.INFRASTRUCTURE,
    scholarship: HelpType.SCHOLARSHIP,
    health_welfare: HelpType.HEALTH_WELFARE,
    other: HelpType.OTHER,
  };
  return map[v.toLowerCase()];
}

export async function listCasesForAdmin(params: CaseListParams) {
  const skip = params.pageIndex * params.pageSize;
  const take = params.pageSize;

  const where: Prisma.CaseWhereInput = {};

  if (params.globalFilter) {
    const g = params.globalFilter;
    where.OR = [
      { caseReferenceId: { contains: g } },
      { fullName: { contains: g } },
      { phone: { contains: g } },
      { email: { contains: g } },
      { description: { contains: g } },
      { town: { contains: g } },
    ];
  }

  if (params.statusFilter) {
    const st = params.statusFilter.toUpperCase() as CaseStatus;
    if (Object.values(CaseStatus).includes(st)) where.status = st;
  }

  if (params.helpTypeFilter) {
    const ht = parseHelpTypeApi(params.helpTypeFilter);
    if (ht) where.helpType = ht;
  }

  if (params.stateFilter) {
    const sid = parseInt(params.stateFilter, 10);
    if (!Number.isNaN(sid)) where.stateId = sid;
  }

  const createdAt: Prisma.DateTimeFilter = {};
  if (params.dateFrom) createdAt.gte = new Date(params.dateFrom);
  if (params.dateTo) {
    const end = new Date(params.dateTo);
    end.setDate(end.getDate() + 1);
    createdAt.lt = end;
  }
  if (Object.keys(createdAt).length) where.createdAt = createdAt;

  const [rows, total] = await Promise.all([
    prisma.case.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: caseListInclude,
    }),
    prisma.case.count({ where }),
  ]);

  const data = rows.map((c) => ({
    id: c.id,
    case_reference_id: c.caseReferenceId,
    full_name: c.fullName,
    phone: c.phone,
    email: c.email,
    state_id: c.stateId,
    lga_id: c.lgaId,
    town: c.town,
    reporting_for: reportingForToApi(c.reportingFor),
    beneficiary_name: c.beneficiaryName,
    relationship: c.relationship,
    help_type: helpTypeToApi(c.helpType),
    description: c.description,
    info_confirmed: c.infoConfirmed,
    contact_consent: c.contactConsent,
    updates_consent: c.updatesConsent,
    user_id: c.reporterUserId,
    status: caseStatusToApi(c.status),
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    state_name: c.state.name,
    lga_name: c.lga.name,
  }));

  return { data, total };
}

export async function listCasesPaginated(
  page: number,
  limit: number,
  search: string
) {
  const skip = (page - 1) * limit;
  const take = limit;
  const where: Prisma.CaseWhereInput = search
    ? {
        OR: [
          { caseReferenceId: { contains: search } },
          { fullName: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
          { description: { contains: search } },
          { town: { contains: search } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.case.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: caseListInclude,
    }),
    prisma.case.count({ where }),
  ]);

  const data = rows.map((c) => ({
    id: c.id,
    case_reference_id: c.caseReferenceId,
    full_name: c.fullName,
    phone: c.phone,
    email: c.email,
    state_id: c.stateId,
    lga_id: c.lgaId,
    town: c.town,
    reporting_for: reportingForToApi(c.reportingFor),
    beneficiary_name: c.beneficiaryName,
    relationship: c.relationship,
    help_type: helpTypeToApi(c.helpType),
    description: c.description,
    info_confirmed: c.infoConfirmed,
    contact_consent: c.contactConsent,
    updates_consent: c.updatesConsent,
    user_id: c.reporterUserId,
    status: caseStatusToApi(c.status),
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    states: { name: c.state.name },
    lgas: { name: c.lga.name },
  }));

  return { data, total };
}

export async function getCaseStatistics() {
  const [total, pending, reviewing, approved, rejected, completed] =
    await Promise.all([
      prisma.case.count(),
      prisma.case.count({ where: { status: CaseStatus.PENDING } }),
      prisma.case.count({ where: { status: CaseStatus.REVIEWING } }),
      prisma.case.count({ where: { status: CaseStatus.APPROVED } }),
      prisma.case.count({ where: { status: CaseStatus.REJECTED } }),
      prisma.case.count({ where: { status: CaseStatus.COMPLETED } }),
    ]);
  return { total, pending, reviewing, approved, rejected, completed };
}

export async function getCaseWithDetailsById(id: string) {
  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      state: { select: { name: true } },
      lga: { select: { name: true } },
      files: { orderBy: { createdAt: "asc" } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });
  if (!c) return null;

  const authorLabel = (u: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  }) =>
    u.displayName?.trim() ||
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
    "Admin";

  return {
    id: c.id,
    case_reference_id: c.caseReferenceId,
    full_name: c.fullName,
    phone: c.phone,
    email: c.email,
    state_id: c.stateId,
    lga_id: c.lgaId,
    town: c.town,
    reporting_for: reportingForToApi(c.reportingFor) as "myself" | "someone_else",
    beneficiary_name: c.beneficiaryName,
    relationship: c.relationship,
    help_type: helpTypeToApi(c.helpType) as import("@/types/case.types").HelpType,
    description: c.description,
    info_confirmed: c.infoConfirmed,
    contact_consent: c.contactConsent,
    updates_consent: c.updatesConsent,
    user_id: c.reporterUserId,
    status: caseStatusToApi(c.status) as import("@/types/case.types").CaseStatus,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    state_name: c.state.name,
    lga_name: c.lga.name,
    files: c.files.map((f) => ({
      id: f.id,
      case_id: f.caseId,
      file_url: f.fileUrl ?? "",
      file_name: f.fileName,
      file_size: f.fileSize,
      mime_type: f.mimeType,
      created_at: f.createdAt.toISOString(),
    })),
    notes: c.notes.map((n) => ({
      id: n.id,
      case_id: n.caseId,
      note: n.note,
      admin_user_id: n.authorUserId,
      admin_name: authorLabel(n.author),
      created_at: n.createdAt.toISOString(),
    })),
  };
}
