import {
  PaymentDay,
  PledgeInterval,
  PledgeStatus,
  PledgeType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ProjectStatus } from "@prisma/client";

export type CreatePledgeInput = {
  userId: string;
  amount: number;
  pledgeType: "one_time" | "recurring";
  recurrenceInterval?: "monthly" | "quarterly" | "yearly";
  paymentDay?: "today" | "1st" | "28th";
  projectId?: string;
  anonymous?: boolean;
};

function mapPledgeType(t: CreatePledgeInput["pledgeType"]): PledgeType {
  return t === "recurring" ? PledgeType.RECURRING : PledgeType.ONE_TIME;
}

function mapInterval(
  v?: CreatePledgeInput["recurrenceInterval"]
): PledgeInterval | null {
  if (!v) return null;
  const u = v.toUpperCase() as PledgeInterval;
  return Object.values(PledgeInterval).includes(u) ? u : null;
}

function mapPaymentDay(v?: CreatePledgeInput["paymentDay"]): PaymentDay | null {
  if (!v) return null;
  if (v === "today") return PaymentDay.TODAY;
  if (v === "1st") return PaymentDay.FIRST;
  if (v === "28th") return PaymentDay.TWENTY_EIGHTH;
  return null;
}

/**
 * Creates a pending pledge after validating the optional project is pledgeable.
 */
export async function createPendingPledge(
  input: CreatePledgeInput
): Promise<{ pledgeId: string } | { error: string }> {
  const {
    userId,
    amount,
    pledgeType,
    recurrenceInterval,
    paymentDay,
    projectId,
    anonymous,
  } = input;

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, status: true },
    });
    if (!project) {
      return { error: "Invalid project ID" };
    }
    if (
      project.status !== ProjectStatus.ACTIVE &&
      project.status !== ProjectStatus.VOTING
    ) {
      return {
        error: "Pledges are only allowed for active or voting projects",
      };
    }
  }

  const pledge = await prisma.pledge.create({
    data: {
      userId,
      projectId: projectId ?? null,
      amount,
      pledgeType: mapPledgeType(pledgeType),
      recurrenceInterval: mapInterval(recurrenceInterval),
      paymentDay: mapPaymentDay(paymentDay),
      status: PledgeStatus.PENDING,
      donorName: anonymous ? "Anonymous" : null,
    },
    select: { id: true },
  });

  return { pledgeId: pledge.id };
}
