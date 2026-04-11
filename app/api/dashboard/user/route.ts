import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/server";
import { getPrimaryRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) {
      return auth.response as NextResponse;
    }

    const userId = auth.userId;

    const [user, pledgeSummary, recentTransactions, projectInvolvement, ongoingProjects] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: {
            userRoles: {
              include: {
                role: {
                  select: { key: true },
                },
              },
            },
          },
        }),
        prisma.pledge.findMany({
          where: { userId },
          include: {
            project: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.transaction.findMany({
          where: { userId, status: "COMPLETED" },
          include: {
            project: {
              select: {
                title: true,
              },
            },
          },
          orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
          take: 5,
        }),
        prisma.transaction.groupBy({
          by: ["projectId"],
          where: {
            userId,
            projectId: { not: null },
            status: "COMPLETED",
          },
          _sum: {
            amount: true,
          },
        }),
        prisma.project.findMany({
          where: {
            status: { in: ["ACTIVE", "VOTING", "PROPOSED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const projectIds = projectInvolvement
      .map((item) => item.projectId)
      .filter((projectId): projectId is string => Boolean(projectId));

    const contributionProjects = projectIds.length
      ? await prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, title: true },
        })
      : [];

    const projectTitleMap = new Map(
      contributionProjects.map((project) => [project.id, project.title])
    );

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const completedTransactions = recentTransactions.filter((transaction) => transaction.status === "COMPLETED");
    const contributionsThisMonth = recentTransactions
      .filter(
        (transaction) =>
          transaction.paidAt &&
          new Date(transaction.paidAt) >= monthStart
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return NextResponse.json(
      {
        profile: {
          id: user.id,
          first_name: user.firstName || "",
          last_name: user.lastName || "",
          email: user.email,
          role: getPrimaryRole(user.userRoles),
          avatar_url: user.avatarUrl || undefined,
          created_at: user.createdAt.toISOString(),
        },
        total_contributions: pledgeSummary.reduce(
          (sum, pledge) => sum + Number(pledge.amount),
          0
        ),
        contributions_this_month: contributionsThisMonth,
        current_recurring_pledge:
          pledgeSummary.find(
            (pledge) =>
              pledge.pledgeType === "RECURRING" &&
              ["ACTIVE", "PENDING"].includes(pledge.status)
          )
            ? {
                pledge_id: pledgeSummary.find(
                  (pledge) =>
                    pledge.pledgeType === "RECURRING" &&
                    ["ACTIVE", "PENDING"].includes(pledge.status)
                )!.id,
                project_id: pledgeSummary.find(
                  (pledge) =>
                    pledge.pledgeType === "RECURRING" &&
                    ["ACTIVE", "PENDING"].includes(pledge.status)
                )!.projectId || undefined,
                project_title:
                  pledgeSummary.find(
                    (pledge) =>
                      pledge.pledgeType === "RECURRING" &&
                      ["ACTIVE", "PENDING"].includes(pledge.status)
                  )!.project?.title || undefined,
                amount: Number(
                  pledgeSummary.find(
                    (pledge) =>
                      pledge.pledgeType === "RECURRING" &&
                      ["ACTIVE", "PENDING"].includes(pledge.status)
                  )!.amount
                ),
                status: pledgeSummary.find(
                  (pledge) =>
                    pledge.pledgeType === "RECURRING" &&
                    ["ACTIVE", "PENDING"].includes(pledge.status)
                )!.status.toLowerCase(),
                recurrence_interval:
                  pledgeSummary
                    .find(
                      (pledge) =>
                        pledge.pledgeType === "RECURRING" &&
                        ["ACTIVE", "PENDING"].includes(pledge.status)
                    )!
                    .recurrenceInterval?.toLowerCase() || "monthly",
              }
            : null,
        project_involvement: projectInvolvement.map((item) => ({
          project_id: item.projectId!,
          project_title: projectTitleMap.get(item.projectId!) || "Project",
          total_contributed: Number(item._sum.amount || 0),
        })),
        pledge_status_summary: {
          active: pledgeSummary.filter((pledge) => pledge.status === "ACTIVE").length,
          completed: pledgeSummary.filter((pledge) => pledge.status === "COMPLETED").length,
          pending: pledgeSummary.filter((pledge) => pledge.status === "PENDING").length,
        },
        recent_transactions: recentTransactions.map((transaction) => ({
          id: transaction.id,
          amount: Number(transaction.amount),
          payment_method: transaction.paymentMethod || undefined,
          paid_at: (transaction.paidAt || transaction.createdAt).toISOString(),
          project_title: transaction.project?.title || undefined,
          currency: transaction.currency,
        })),
        ongoing_projects: ongoingProjects.map((project) => ({
          id: project.id,
          title: project.title,
          slug: project.slug,
          description: project.description,
          goal_amount: Number(project.goalAmount),
          current_amount: Number(project.currentAmount),
          status: project.status.toLowerCase(),
          cover_image: project.coverImageUrl || undefined,
          created_at: project.createdAt.toISOString(),
          updated_at: project.updatedAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
