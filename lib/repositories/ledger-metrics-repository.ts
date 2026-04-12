import type { Prisma } from "@prisma/client";
import {
  PledgeType,
  ProjectStatus,
  SettingDataType,
  TransactionDirection,
  TransactionKind,
  TransactionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dec, projectStatusToApi } from "@/lib/repositories/mappers";
import {
  castJsonValue,
  findActiveSettingByKey,
} from "@/lib/repositories/settings-repository";
import type { RecentProjectSummary } from "@/types/project";

async function numSetting(key: string, fallback: number): Promise<number> {
  const row = await findActiveSettingByKey(key);
  if (!row) return fallback;
  const v = castJsonValue(row.value, row.dataType);
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

async function strSetting(key: string, fallback: string): Promise<string> {
  const row = await findActiveSettingByKey(key);
  if (!row) return fallback;
  const v = castJsonValue(row.value, row.dataType);
  return v != null ? String(v) : fallback;
}

type LedgerSnapshotForMarquee = Pick<
  Awaited<ReturnType<typeof getOpenLedgerMetricsPayload>>,
  | "active_villagers"
  | "monthly_contributions"
  | "cash_on_hand"
  | "monthly_operational_costs"
  | "cash_deployed"
>;

function metricAmountForMarquee(
  metricKey: string,
  ledger: LedgerSnapshotForMarquee
): number | null {
  switch (metricKey) {
    case "active_villagers":
      return ledger.active_villagers;
    case "monthly_contributions":
      return ledger.monthly_contributions;
    case "cash_on_hand":
      return ledger.cash_on_hand;
    case "monthly_operational_costs":
    case "monthly_fixed_costs":
      return ledger.monthly_operational_costs;
    case "cash_deployed":
      return ledger.cash_deployed;
    default:
      return null;
  }
}

export async function getMarqueePayload() {
  const defaultCurrency = await strSetting("default_currency", "NGN");
  const raw = await findActiveSettingByKey("marquee_featured_items");
  if (raw && raw.dataType === SettingDataType.JSON) {
    const parsed = castJsonValue(raw.value, SettingDataType.JSON);
    if (Array.isArray(parsed) && parsed.length > 0) {
      let items: Record<string, unknown>[] = parsed
        .filter((x: unknown) => x && typeof (x as { id?: string }).id === "string")
        .map((x: Record<string, unknown>, i: number) => ({
          ...x,
          order: typeof x.order === "number" ? x.order : i,
        }));

      const hasMetricTile = items.some((row) => row.type === "metric");
      if (hasMetricTile) {
        const ledger = await getOpenLedgerMetricsPayload();
        items = items.map((row) => {
          if (row.type !== "metric") return row;
          const key =
            (typeof row.metric_type === "string" && row.metric_type) ||
            (typeof row.id === "string" ? row.id : "");
          if (!key) return row;
          const amount = metricAmountForMarquee(key, ledger);
          if (amount === null) return row;
          const href =
            typeof row.href === "string" && row.href.length > 0
              ? row.href
              : "/public-ledger";
          return {
            ...row,
            href,
            metric_type: typeof row.metric_type === "string" ? row.metric_type : key,
            /** Plain number string so client parseFloat is exact (admin tiles omit value). */
            value: String(amount),
          };
        });
      }

      return { items, default_currency: defaultCurrency };
    }
  }

  const projects = await prisma.project.findMany({
    where: {
      featuredRank: { not: null },
      status: {
        in: [
          ProjectStatus.ACTIVE,
          ProjectStatus.VOTING,
          ProjectStatus.PROPOSED,
          ProjectStatus.COMPLETED,
        ],
      },
    },
    orderBy: { featuredRank: "asc" },
    take: 8,
  });

  const items = projects.map((p) => {
    const goal = dec(p.goalAmount);
    const current = dec(p.currentAmount);
    const progress = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
    return {
      id: p.id,
      type: "project" as const,
      href: `/projects/${p.slug}`,
      order: p.featuredRank ?? 0,
      title: p.title,
      description: p.description,
      image_src: p.coverImageUrl ?? "",
      image_alt: `${p.title} cover image`,
      country: p.country ?? "",
      progress,
      slug: p.slug,
      status: projectStatusToApi(p.status),
      goal_amount: goal,
      current_amount: current,
      created_at: p.createdAt.toISOString(),
    };
  });

  return { items, default_currency: defaultCurrency };
}

export async function getOpenLedgerMetricsPayload() {
  const currency = await strSetting("default_currency", "NGN");
  const dataSource = await strSetting("metrics_data_source", "mysql_prisma_aggregate");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  /** Effective booked time: postedAt ?? paidAt ?? createdAt (many pledge rows never set postedAt). */
  const contributionsThisMonthWhere: Prisma.TransactionWhereInput = {
    status: TransactionStatus.COMPLETED,
    direction: TransactionDirection.CREDIT,
    kind: { in: [TransactionKind.PLEDGE, TransactionKind.DONATION] },
    OR: [
      {
        AND: [
          { postedAt: { not: null } },
          { postedAt: { gte: monthStart } },
        ],
      },
      {
        AND: [
          { postedAt: null },
          { paidAt: { not: null } },
          { paidAt: { gte: monthStart } },
        ],
      },
      {
        AND: [
          { postedAt: null },
          { paidAt: null },
          { createdAt: { gte: monthStart } },
        ],
      },
    ],
  };

  const [
    activeVillagers,
    monthlyRows,
    cashCredits,
    cashDebits,
    oneTimeSum,
    recurringSum,
    totalContrib,
    recentProjects,
    manualVillagers,
    manualMonthly,
    manualCash,
    manualOps,
    manualDeployed,
    manualGeneral,
    manualProjectFund,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        transactions: {
          some: { status: TransactionStatus.COMPLETED },
        },
      },
    }),
    prisma.transaction.aggregate({
      where: contributionsThisMonthWhere,
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.COMPLETED,
        direction: TransactionDirection.CREDIT,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.COMPLETED,
        direction: TransactionDirection.DEBIT,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.COMPLETED,
        pledge: { is: { pledgeType: PledgeType.ONE_TIME } },
        direction: TransactionDirection.CREDIT,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.COMPLETED,
        pledge: { is: { pledgeType: PledgeType.RECURRING } },
        direction: TransactionDirection.CREDIT,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.COMPLETED,
        direction: TransactionDirection.CREDIT,
      },
      _sum: { amount: true },
    }),
    prisma.project.findMany({
      where: {
        status: {
          in: [
            ProjectStatus.ACTIVE,
            ProjectStatus.COMPLETED,
            ProjectStatus.VOTING,
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    numSetting("manual_active_villagers", 0),
    numSetting("manual_monthly_contributions", 0),
    numSetting("manual_cash_on_hand", 0),
    numSetting("monthly_operational_costs", 0),
    numSetting("manual_cash_deployed", 0),
    numSetting("general_fund_balance", 0),
    numSetting("project_specific_fund_balance", 0),
  ]);

  const active_villagers = manualVillagers || activeVillagers;
  const monthly_contributions =
    manualMonthly || dec(monthlyRows._sum?.amount);
  const cash_on_hand = manualCash || dec(cashCredits._sum.amount) - dec(cashDebits._sum.amount);
  const monthly_operational_costs = manualOps;
  const cash_deployed = manualDeployed || dec(cashDebits._sum.amount);
  const general_fund = manualGeneral;
  const project_specific_fund = manualProjectFund;
  const one_time_total = dec(oneTimeSum._sum.amount);
  const recurring_total = dec(recurringSum._sum.amount);
  const total_contributions = dec(totalContrib._sum.amount);

  const recent_projects: RecentProjectSummary[] = recentProjects.map((p) => ({
    title: p.title,
    slug: p.slug,
    country: p.country ?? "",
    cover_image: p.coverImageUrl ?? "",
    status: projectStatusToApi(p.status),
    description: p.description,
    goal_amount: dec(p.goalAmount),
    state: p.state ?? "",
    sector: p.sector ?? "",
  }));

  return {
    success: true,
    error: false,
    active_villagers,
    monthly_contributions,
    cash_on_hand,
    monthly_operational_costs,
    cash_deployed,
    general_fund,
    project_specific_fund,
    one_time_total,
    recurring_total,
    total_contributions,
    recent_projects,
    data_source: dataSource,
    last_updated: new Date().toISOString(),
    currency,
  };
}
