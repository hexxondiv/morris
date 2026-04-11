import type { Prisma } from "@prisma/client";
import {
  TransactionKind,
  TransactionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  dec,
  transactionKindToApi,
  transactionStatusToApi,
} from "@/lib/repositories/mappers";

const txAdminInclude = {
  user: { select: { email: true, firstName: true, lastName: true } },
  project: { select: { title: true } },
  ledgerAccount: { select: { code: true, name: true, publicName: true } },
} satisfies Prisma.TransactionInclude;

export type TransactionAdminListParams = {
  pageIndex: number;
  pageSize: number;
  globalFilter: string;
  statusFilter: string;
  typeFilter: string;
  methodFilter: string;
  categoryFilter: string;
  dateFrom: string | null;
  dateTo: string | null;
  dateField: "created_at" | "paid_at";
};

function parseStatus(s: string): TransactionStatus | undefined {
  const u = s.toUpperCase() as TransactionStatus;
  return Object.values(TransactionStatus).includes(u) ? u : undefined;
}

function parseKind(s: string): TransactionKind | undefined {
  const u = s.toUpperCase() as TransactionKind;
  return Object.values(TransactionKind).includes(u) ? u : undefined;
}

function prismaDateField(
  f: TransactionAdminListParams["dateField"]
): "createdAt" | "paidAt" {
  return f === "paid_at" ? "paidAt" : "createdAt";
}

function buildWhere(
  params: TransactionAdminListParams
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};

  if (params.statusFilter) {
    const st = parseStatus(params.statusFilter);
    if (st) where.status = st;
  }
  if (params.typeFilter) {
    const k = parseKind(params.typeFilter);
    if (k) where.kind = k;
  }
  if (params.methodFilter) {
    where.paymentMethod = { contains: params.methodFilter };
  }
  if (params.categoryFilter) {
    where.ledgerAccount = { code: params.categoryFilter };
  }

  const df = prismaDateField(params.dateField);
  const range: Prisma.DateTimeFilter = {};
  if (params.dateFrom) range.gte = new Date(params.dateFrom);
  if (params.dateTo) range.lte = new Date(params.dateTo);
  if (Object.keys(range).length) {
    where[df] = range;
  }

  if (params.globalFilter) {
    const g = params.globalFilter;
    where.OR = [
      { paymentReference: { contains: g } },
      { id: { contains: g } },
      { userId: { contains: g } },
      { externalReference: { contains: g } },
      { description: { contains: g } },
      {
        user: {
          OR: [
            { email: { contains: g } },
            { firstName: { contains: g } },
            { lastName: { contains: g } },
          ],
        },
      },
    ];
  }

  return where;
}

export function mapTransactionAdminRow(
  t: Prisma.TransactionGetPayload<{ include: typeof txAdminInclude }>,
  totalCount: number
) {
  return {
    id: t.id,
    pledge_id: t.pledgeId,
    user_id: t.userId,
    payment_type: transactionKindToApi(t.kind) as
      | "pledge"
      | "donation"
      | "deployment"
      | "expense"
      | "refund",
    amount: dec(t.amount),
    currency: t.currency,
    payment_method: t.paymentMethod,
    payment_status: transactionStatusToApi(t.status) as
      | "pending"
      | "completed"
      | "failed"
      | "refunded"
      | "cancelled",
    payment_ref: t.paymentReference,
    paid_at: t.paidAt?.toISOString() ?? "",
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
    category: t.ledgerAccount?.code ?? null,
    chart_id: t.ledgerAccountId ?? "",
    chart_name: t.ledgerAccount?.name ?? null,
    chart_public_name: t.ledgerAccount?.publicName ?? null,
    project_id: t.projectId,
    project_title: t.project?.title ?? null,
    project_timeline_id: null,
    project_timeline_title: null,
    description: t.description ?? undefined,
    metadata: (t.metadata as Record<string, unknown> | null) ?? null,
    profiles: t.user
      ? {
          email: t.user.email,
          first_name: t.user.firstName,
          last_name: t.user.lastName,
        }
      : null,
    total_count: totalCount,
  };
}

export async function listTransactionsForAdmin(params: TransactionAdminListParams) {
  const where = buildWhere(params);
  const skip = params.pageIndex * params.pageSize;
  const take = params.pageSize;
  const orderField = prismaDateField(params.dateField);

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take,
      orderBy: { [orderField]: "desc" },
      include: txAdminInclude,
    }),
    prisma.transaction.count({ where }),
  ]);

  const data = rows.map((r) => mapTransactionAdminRow(r, total));
  return { data, total };
}

export async function listTransactionsForExport(
  params: TransactionAdminListParams
) {
  const where = buildWhere(params);
  const orderField = prismaDateField(params.dateField);
  return prisma.transaction.findMany({
    where,
    orderBy: { [orderField]: "desc" },
    include: txAdminInclude,
  });
}

export function parseTransactionStatusFromApi(
  raw: string
): TransactionStatus | undefined {
  const key = raw.trim().toUpperCase().replace(/-/g, "_");
  return Object.values(TransactionStatus).includes(key as TransactionStatus)
    ? (key as TransactionStatus)
    : undefined;
}

export async function updateTransactionStatusById(
  id: string,
  status: TransactionStatus
) {
  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id },
      data: { status },
    });
  });
  return getTransactionDetailById(id);
}

export async function getTransactionDetailById(id: string) {
  const t = await prisma.transaction.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      project: { select: { title: true } },
      ledgerAccount: { select: { code: true, name: true, publicName: true } },
    },
  });
  if (!t) return null;

  const userName = t.user
    ? `${t.user.firstName ?? ""} ${t.user.lastName ?? ""}`.trim() || t.user.email
    : "Unknown";

  return {
    id: t.id,
    pledge_id: t.pledgeId,
    user_id: t.userId ?? "",
    user_email: t.user?.email,
    user_name: userName,
    project_id: t.projectId,
    chart_id: t.ledgerAccountId ?? "",
    chart_name: t.ledgerAccount?.name ?? null,
    chart_public_name: t.ledgerAccount?.publicName ?? null,
    project_title: t.project?.title ?? null,
    project_timeline_id: null,
    project_timeline_title: null,
    payment_type: transactionKindToApi(t.kind) as import("@/types/transaction").Transaction["payment_type"],
    amount: dec(t.amount),
    currency: t.currency,
    payment_method: t.paymentMethod,
    payment_status: transactionStatusToApi(t.status) as import("@/types/transaction").Transaction["payment_status"],
    description: t.description ?? undefined,
    payment_ref: t.paymentReference,
    metadata: (t.metadata as Record<string, unknown> | null) ?? null,
    paid_at: t.paidAt?.toISOString() ?? "",
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
    category: t.ledgerAccount?.code ?? null,
  };
}
