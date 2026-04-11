import { LedgerAccountCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type ChartType = "expense" | "deployment";

function categoriesForChartType(chartType: ChartType): LedgerAccountCategory[] {
  return chartType === "expense"
    ? [LedgerAccountCategory.EXPENSE]
    : [LedgerAccountCategory.DEPLOYMENT];
}

export async function listLedgerAccountsByChartType(chartType?: ChartType) {
  const where =
    chartType != null
      ? { category: { in: categoriesForChartType(chartType) }, isActive: true }
      : {
          category: {
            in: [
              LedgerAccountCategory.EXPENSE,
              LedgerAccountCategory.DEPLOYMENT,
            ],
          },
          isActive: true,
        };

  const rows = await prisma.ledgerAccount.findMany({
    where,
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    public_name: r.publicName ?? "",
    description: r.description ?? "",
    chart_type: (r.category === LedgerAccountCategory.DEPLOYMENT
      ? "deployment"
      : "expense") as ChartType,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }));
}

export async function suggestNextChartCode(chartType: ChartType) {
  const prefix = chartType === "expense" ? "EXP" : "DEP";
  const rows = await prisma.ledgerAccount.findMany({
    where: {
      category: { in: categoriesForChartType(chartType) },
      code: { startsWith: prefix },
    },
    select: { code: true },
    orderBy: { code: "desc" },
    take: 200,
  });

  const numbers = rows
    .map((c) => {
      const m = c.code.match(new RegExp(`^${prefix}(\\d+)`));
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  let next = 1;
  for (const n of numbers) {
    if (n === next) next++;
    else break;
  }
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export async function ledgerAccountExistsByCode(code: string) {
  const row = await prisma.ledgerAccount.findUnique({
    where: { code },
    select: { id: true },
  });
  return Boolean(row);
}

export async function createLedgerAccountFromChartInput(data: {
  code: string;
  name: string;
  public_name: string;
  description: string;
  chart_type: ChartType;
}) {
  const category =
    data.chart_type === "deployment"
      ? LedgerAccountCategory.DEPLOYMENT
      : LedgerAccountCategory.EXPENSE;
  return prisma.ledgerAccount.create({
    data: {
      code: data.code,
      name: data.name,
      publicName: data.public_name,
      description: data.description,
      category,
      isSystem: false,
      isActive: true,
    },
  });
}
