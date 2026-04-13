import {
  LedgerAccountCategory,
  Prisma,
  ProjectStageStatus,
  ProjectStatus,
  TransactionDirection,
  TransactionKind,
  TransactionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type CreateTransactionInput = {
  userId: string;
  amount: number;
  pledgeId?: string;
  paymentType: "pledge" | "deployment" | "expense";
  projectId?: string;
  anonymous?: boolean;
  currency: string;
  chartId?: string;
  description?: string;
  paymentRef?: string;
  timelineStageId?: string;
};

function kindForPaymentType(
  t: CreateTransactionInput["paymentType"]
): TransactionKind {
  switch (t) {
    case "pledge":
      return TransactionKind.PLEDGE;
    case "deployment":
      return TransactionKind.DEPLOYMENT;
    case "expense":
      return TransactionKind.EXPENSE;
    default:
      return TransactionKind.ADJUSTMENT;
  }
}

export type CreateTransactionResult =
  | { ok: true; txRef: string; transactionId: string }
  | { ok: false; status: number; error: string };

export async function createLedgerTransaction(
  input: CreateTransactionInput
): Promise<CreateTransactionResult> {
  const {
    userId,
    amount,
    pledgeId,
    paymentType,
    projectId,
    anonymous,
    currency,
    chartId,
    description,
    paymentRef,
    timelineStageId,
  } = input;

  if (paymentType === "pledge" && pledgeId) {
    const pledge = await prisma.pledge.findUnique({
      where: { id: pledgeId },
      select: { id: true },
    });
    if (!pledge) {
      return { ok: false, status: 400, error: "Invalid pledgeId" };
    }
  }

  if ((paymentType === "deployment" || paymentType === "expense") && !chartId) {
    return {
      ok: false,
      status: 400,
      error: "chartId is required for deployment and expense transactions",
    };
  }

  if (paymentType === "deployment" && !projectId) {
    return {
      ok: false,
      status: 400,
      error: "projectId is required for deployment transactions",
    };
  }

  if (paymentType === "deployment" && !timelineStageId) {
    return {
      ok: false,
      status: 400,
      error: "timelineStageId is required for deployment transactions",
    };
  }

  if (chartId) {
    const account = await prisma.ledgerAccount.findUnique({
      where: { id: chartId },
      select: { id: true, category: true },
    });
    if (!account) {
      return { ok: false, status: 400, error: "Invalid chartId" };
    }
    const expected =
      paymentType === "deployment"
        ? LedgerAccountCategory.DEPLOYMENT
        : paymentType === "expense"
          ? LedgerAccountCategory.EXPENSE
          : null;
    if (expected && account.category !== expected) {
      return {
        ok: false,
        status: 400,
        error: `Chart type mismatch. Expected ${paymentType} ledger category.`,
      };
    }
  }

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    if (!project) {
      return { ok: false, status: 400, error: "Invalid projectId" };
    }
    if (
      paymentType === "deployment" &&
      project.status !== ProjectStatus.ACTIVE
    ) {
      return {
        ok: false,
        status: 400,
        error: "Project must be active for deployment transactions",
      };
    }
  }

  if (timelineStageId && projectId) {
    const stage = await prisma.projectStage.findFirst({
      where: { id: timelineStageId },
      include: {
        timeline: { select: { projectId: true } },
      },
    });
    if (!stage || stage.timeline.projectId !== projectId) {
      return {
        ok: false,
        status: 400,
        error: "Timeline stage does not belong to the specified project",
      };
    }
    if (stage.status === ProjectStageStatus.COMPLETED) {
      return {
        ok: false,
        status: 400,
        error: "Cannot create transaction for completed timeline stage",
      };
    }
  }

  const txRef =
    paymentRef ||
    `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  const kind = kindForPaymentType(paymentType);
  const direction =
    paymentType === "pledge"
      ? TransactionDirection.CREDIT
      : TransactionDirection.DEBIT;
  const status =
    paymentType === "pledge"
      ? TransactionStatus.PENDING
      : TransactionStatus.COMPLETED;

  try {
    const row = await prisma.$transaction(async (tx) => {
      return tx.transaction.create({
        data: {
          userId,
          pledgeId: paymentType === "pledge" ? pledgeId ?? null : null,
          projectId: projectId ?? null,
          projectStageId: timelineStageId ?? null,
          ledgerAccountId: chartId ?? null,
          direction,
          kind,
          amount,
          currency,
          status,
          paymentReference: txRef,
          paidAt: paymentType === "pledge" ? null : new Date(),
          description:
            paymentType === "pledge" ? null : (description ?? null),
          metadata:
            paymentType === "pledge"
              ? ({
                  paymentType,
                  anonymous: Boolean(anonymous),
                } as Prisma.InputJsonValue)
              : paymentType === "deployment" && timelineStageId
              ? ({
                  timeline_stage_id: timelineStageId,
                  paymentType,
                } as Prisma.InputJsonValue)
              : undefined,
        },
        select: { id: true, paymentReference: true },
      });
    });

    return {
      ok: true,
      txRef: row.paymentReference ?? txRef,
      transactionId: row.id,
    };
  } catch (e) {
    console.error("createLedgerTransaction failed:", e);
    return { ok: false, status: 500, error: "Failed to create transaction" };
  }
}
