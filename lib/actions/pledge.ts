"use server";

import {
  PledgeStatus,
  TransactionDirection,
  TransactionKind,
  TransactionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { pledgeSchema } from "../zod-schema";
import { createPendingPledge } from "@/lib/services/pledge-service";
import {
  listPledgesForAdmin,
  mapPledgeAdminTableRow,
} from "@/lib/repositories/pledge-repository";
import { ProjectStatus } from "@prisma/client";

export async function createPledge(formData: FormData) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return { error: "You must be signed in to pledge" };
    }

    const data = {
      projectId: formData.get("projectId") as string | undefined,
      amount: Number(formData.get("amount")),
      pledgeType: formData.get("pledgeType") as "one_time" | "recurring",
      recurrenceInterval: formData.get("recurrenceInterval") as
        | "monthly"
        | "quarterly"
        | "yearly"
        | undefined,
      paymentDay: formData.get("paymentDay") as "today" | "1st" | "28th" | undefined,
    };

    const validated = pledgeSchema.safeParse(data);
    if (!validated.success) {
      return { error: validated.error.errors[0].message };
    }

    let projectSlug: string | null = null;
    if (validated.data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: validated.data.projectId },
        select: { status: true, slug: true },
      });

      if (!project) {
        return { error: "Project not found" };
      }

      if (
        project.status !== ProjectStatus.ACTIVE &&
        project.status !== ProjectStatus.VOTING
      ) {
        return { error: "Pledges are only allowed for active or voting projects" };
      }
      projectSlug = project.slug;
    }

    const created = await createPendingPledge({
      userId,
      amount: validated.data.amount,
      pledgeType: validated.data.pledgeType,
      recurrenceInterval: validated.data.recurrenceInterval ?? undefined,
      paymentDay: validated.data.paymentDay ?? undefined,
      projectId: validated.data.projectId ?? undefined,
    });

    if ("error" in created) {
      return { error: created.error };
    }

    if (projectSlug) {
      revalidatePath(`/projects/${projectSlug}`);
    }
    revalidatePath("/dashboard");

    return { success: "Pledge created successfully", projectSlug };
  } catch (error) {
    console.error("Error creating pledge:", error);
    return { error: "Internal server error" };
  }
}

interface Pledge {
  id: string;
  user_id: string;
  user_email: string;
  full_name: string;
  project_id: string | null;
  project_title: string | null;
  amount: number;
  pledge_type: "one_time" | "recurring";
  recurrence_interval: "monthly" | "quarterly" | "yearly" | null;
  payment_day: "today" | "1st" | "28th" | null;
  status: "pending" | "completed" | "failed" | "cancelled";
  created_at: string;
}

export async function fetchPledges(
  pageIndex: number,
  pageSize: number,
  globalFilter: string
) {
  try {
    const { rows, total } = await listPledgesForAdmin({
      pageIndex,
      pageSize,
      globalFilter,
      statusFilter: "",
      pledgeTypeFilter: "",
      recurrenceIntervalFilter: "",
      dateFrom: null,
      dateTo: null,
      dateField: "created_at",
    });

    const pledges: Pledge[] = rows.map((p) => {
      const m = mapPledgeAdminTableRow(p);
      return {
        id: m.id,
        user_id: m.user_id ?? "",
        user_email: m.user_email,
        full_name: m.full_name,
        project_id: m.project_id,
        project_title: m.project_title,
        amount: m.amount,
        pledge_type: m.pledge_type as Pledge["pledge_type"],
        recurrence_interval: m.recurrence_interval as Pledge["recurrence_interval"],
        payment_day: m.payment_day as Pledge["payment_day"],
        status: m.status as Pledge["status"],
        created_at: m.created_at,
      };
    });

    return { data: pledges, total };
  } catch (error) {
    console.error("Error fetching pledges:", error);
    return { data: [], total: 0 };
  }
}

export async function markPledgeAsCompleted(
  pledgeId: string,
  userId: string,
  projectId: string | null,
  amount: number
) {
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.pledge.updateMany({
        where: { id: pledgeId, status: PledgeStatus.PENDING },
        data: { status: PledgeStatus.COMPLETED, completedAt: new Date() },
      });

      if (updated.count !== 1) {
        throw new Error("Pledge is not in pending status or does not exist");
      }

      await tx.transaction.create({
        data: {
          pledgeId,
          userId,
          projectId,
          amount,
          currency: "NGN",
          direction: TransactionDirection.CREDIT,
          kind: TransactionKind.PLEDGE,
          status: TransactionStatus.COMPLETED,
          paidAt: new Date(),
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking pledge as completed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
