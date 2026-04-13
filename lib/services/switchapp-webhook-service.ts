import { PledgeStatus, Prisma, TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseTransactionStatusFromApi } from "@/lib/repositories/transaction-repository";

export type SwitchappWebhookMetadata = {
  userId: string;
  pledgeId?: string;
  paymentType: "pledge" | "donation";
  projectId?: string;
  campaign?: string;
  anonymous?: boolean;
};

const PROJECT_INCREMENT_FLAG = "switchappProjectIncrementApplied" as const;

/** Parse Switch `metadata` from webhooks or verify API (string JSON or object). */
export function parseChargeMetadataFromSwitch(
  raw: string | Record<string, unknown> | null | undefined
): SwitchappWebhookMetadata | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (typeof o.userId === "string" && typeof o.paymentType === "string") {
      return o as SwitchappWebhookMetadata;
    }
    return null;
  }
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    const o = parsed as Record<string, unknown>;
    if (typeof o.userId === "string" && typeof o.paymentType === "string") {
      return o as SwitchappWebhookMetadata;
    }
    return null;
  } catch {
    return null;
  }
}

function mapGatewayStatus(raw: string): string {
  return raw === "successful" ? "completed" : raw;
}

function mapPledgeRowStatus(mappedStatus: string): PledgeStatus {
  const s = mappedStatus.toLowerCase();
  if (s === "completed") return PledgeStatus.COMPLETED;
  if (s === "failed") return PledgeStatus.FAILED;
  if (s === "cancelled") return PledgeStatus.CANCELLED;
  if (s === "refunded") return PledgeStatus.CANCELLED;
  return PledgeStatus.PENDING;
}

export async function applySwitchappChargeOutcome(input: {
  txRef: string;
  gatewayStatus: string;
  paymentChannel?: string;
  metadata: SwitchappWebhookMetadata;
  switchappEvent: string;
  paidAt?: string;
  amount: number;
}): Promise<void> {
  const mapped = mapGatewayStatus(input.gatewayStatus);
  const txnStatus =
    parseTransactionStatusFromApi(mapped) ?? TransactionStatus.PENDING;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({
      where: { paymentReference: input.txRef },
      include: {
        pledge: { select: { id: true, projectId: true } },
      },
    });

    if (!existing) {
      throw new Error(`No transaction found for ref ${input.txRef}`);
    }

    const prevMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
    const projectCreditAlreadyApplied =
      prevMeta[PROJECT_INCREMENT_FLAG] === true;

    const mergedMeta: Record<string, unknown> = {
      ...prevMeta,
      ...input.metadata,
      updatedStatus: mapped,
      switchappEvent: input.switchappEvent,
      paid_at: input.paidAt ?? null,
    };
    if (projectCreditAlreadyApplied) {
      mergedMeta[PROJECT_INCREMENT_FLAG] = true;
    }

    await tx.transaction.update({
      where: { id: existing.id },
      data: {
        status: txnStatus,
        paymentMethod: input.paymentChannel ?? existing.paymentMethod,
        metadata: mergedMeta as Prisma.InputJsonValue,
        paidAt: input.paidAt ? new Date(input.paidAt) : existing.paidAt,
      },
    });

    if (input.metadata.paymentType !== "pledge" || !existing.pledgeId) {
      return;
    }

    const pledge = existing.pledge;
    if (!pledge) {
      throw new Error("Pledge row missing for pledge transaction");
    }

    const pledgeStatus = mapPledgeRowStatus(mapped);

    await tx.pledge.update({
      where: { id: pledge.id },
      data: { status: pledgeStatus },
    });

    const shouldCreditProject =
      txnStatus === TransactionStatus.COMPLETED &&
      Boolean(pledge.projectId) &&
      !projectCreditAlreadyApplied;

    if (!shouldCreditProject) {
      return;
    }

    await tx.project.update({
      where: { id: pledge.projectId! },
      data: {
        currentAmount: {
          increment: input.amount,
        },
      },
    });

    mergedMeta[PROJECT_INCREMENT_FLAG] = true;
    await tx.transaction.update({
      where: { id: existing.id },
      data: {
        metadata: mergedMeta as Prisma.InputJsonValue,
      },
    });
  });
}
