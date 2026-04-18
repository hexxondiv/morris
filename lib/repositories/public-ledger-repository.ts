import type { Prisma } from "@prisma/client";
import {
  TransactionDirection,
  TransactionKind,
  TransactionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dec, transactionKindToApi } from "@/lib/repositories/mappers";

export type PublicLedgerFilter = "all" | "inflow" | "outflow";

export async function getPublicLedgerData(
  limit: number,
  filterType: PublicLedgerFilter
) {
  const whereBase: Prisma.TransactionWhereInput = {
    status: TransactionStatus.COMPLETED,
  };

  if (filterType === "inflow") {
    whereBase.direction = TransactionDirection.CREDIT;
  } else if (filterType === "outflow") {
    whereBase.direction = TransactionDirection.DEBIT;
  }

  const take = Math.min(Math.max(limit, 1), 500);

  const rows = await prisma.transaction.findMany({
    where: whereBase,
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    take: take + 1,
    include: {
      ledgerAccount: { select: { name: true, publicName: true, category: true } },
      project: { select: { title: true } },
      pledge: { select: { donorName: true } },
      user: { select: { displayName: true, firstName: true, lastName: true, email: true } },
    },
  });

  const hasMore = rows.length > take;
  const pagedRows = hasMore ? rows.slice(0, take) : rows;
  const asc = [...pagedRows].reverse();
  let running = 0;
  const ascWithRunning = asc.map((t) => {
    const signed =
      t.direction === TransactionDirection.CREDIT ? dec(t.amount) : -dec(t.amount);
    running += signed;
    const metadata =
      typeof t.metadata === "object" && t.metadata ? t.metadata : null;
    const metadataDonorName =
      metadata &&
      "donorName" in metadata &&
      typeof (metadata as { donorName?: string }).donorName === "string"
        ? (metadata as { donorName: string }).donorName.trim()
        : "";
    const metadataAnonymous =
      metadata &&
      "anonymous" in metadata &&
      typeof (metadata as { anonymous?: unknown }).anonymous === "boolean"
        ? Boolean((metadata as { anonymous: boolean }).anonymous)
        : false;
    const pledgeDonorName = t.pledge?.donorName?.trim() ?? "";
    const donor =
      metadataAnonymous || pledgeDonorName.toLowerCase() === "anonymous"
        ? "Anonymous"
        : metadataDonorName ||
          pledgeDonorName ||
          t.user?.displayName?.trim() ||
          [t.user?.firstName, t.user?.lastName].filter(Boolean).join(" ").trim() ||
          t.user?.email ||
          "Anonymous";

    const kindLabel = transactionKindToApi(t.kind);
    const category =
      t.ledgerAccount?.publicName || t.ledgerAccount?.name || kindLabel;

    return {
      id: t.id,
      date: (t.postedAt ?? t.createdAt).toISOString(),
      type: (t.direction === TransactionDirection.CREDIT
        ? "inflow"
        : "outflow") as "inflow" | "outflow",
      description: t.description || `${kindLabel} - ${t.project?.title ?? "General"}`,
      amount: Math.abs(dec(t.amount)),
      category,
      subcategory: t.project?.title || "Platform",
      reference: t.paymentReference || t.externalReference || t.id,
      items: donor,
      status: t.status.toLowerCase(),
      payment_method: t.paymentMethod || "unknown",
      running_balance: running,
    };
  });

  const entries = [...ascWithRunning].reverse();

  const metricsBase = await prisma.transaction.groupBy({
    by: ["direction"],
    where: { status: TransactionStatus.COMPLETED },
    _sum: { amount: true },
  });

  let totalInflows = 0;
  let totalOutflows = 0;
  for (const g of metricsBase) {
    if (g.direction === TransactionDirection.CREDIT)
      totalInflows += dec(g._sum.amount);
    else totalOutflows += dec(g._sum.amount);
  }

  const transactionCount = await prisma.transaction.count({
    where: { status: TransactionStatus.COMPLETED },
  });

  const topDonorsRaw = await prisma.transaction.groupBy({
    by: ["userId"],
    where: {
      status: TransactionStatus.COMPLETED,
      direction: TransactionDirection.CREDIT,
      kind: { in: [TransactionKind.DONATION, TransactionKind.PLEDGE] },
      userId: { not: null },
    },
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 10,
  });

  const userIds = topDonorsRaw.map((r) => r.userId).filter(Boolean) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const topDonors = topDonorsRaw.map((row) => {
    const u = row.userId ? userMap.get(row.userId) : undefined;
    const name =
      u?.displayName?.trim() ||
      [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
      u?.email ||
      "Supporter";
    return {
      name,
      total_amount: dec(row._sum.amount),
      donation_count: row._count.id,
      is_anonymous: false,
      first_donation: u?.createdAt.toISOString() ?? new Date().toISOString(),
      last_donation: new Date().toISOString(),
    };
  });

  return {
    entries,
    metrics: {
      currentBalance: totalInflows - totalOutflows,
      totalInflows,
      totalOutflows,
      netFlow: totalInflows - totalOutflows,
      transactionCount,
    },
    topDonors,
    hasMore,
  };
}
