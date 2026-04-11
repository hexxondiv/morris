import { PledgeStatus, Prisma, TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseTransactionStatusFromApi } from "@/lib/repositories/transaction-repository";

export type SwitchappWebhookMetadata = {
  userId: string;
  pledgeId?: string;
  paymentType: "pledge" | "donation";
  projectId?: string;
  campaign?: string;
};

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
    const mergedMeta: Prisma.InputJsonValue = {
      ...prevMeta,
      ...input.metadata,
      updatedStatus: mapped,
      switchappEvent: input.switchappEvent,
      paid_at: input.paidAt ?? null,
    };

    await tx.transaction.update({
      where: { id: existing.id },
      data: {
        status: txnStatus,
        paymentMethod: input.paymentChannel ?? existing.paymentMethod,
        metadata: mergedMeta,
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

    if (txnStatus === TransactionStatus.COMPLETED && pledge.projectId) {
      await tx.project.update({
        where: { id: pledge.projectId },
        data: {
          currentAmount: {
            increment: input.amount,
          },
        },
      });
    }
  });
}
