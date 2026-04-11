import { formatCurrency, omit } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { getOpenLedgerMetricsPayload } from "@/lib/repositories/ledger-metrics-repository";

interface OpenLedgerMetricsRaw {
  active_villagers: number;
  monthly_contributions: number;
  cash_on_hand: number;
  monthly_operational_costs: number;
  cash_deployed: number;
  general_fund: number;
  project_specific_fund: number;
  one_time_total: number;
  recurring_total: number;
  total_contributions: number;
  recent_projects: unknown[];
  data_source: string;
  last_updated: string;
  currency: string;
  success: boolean;
  error?: boolean;
  message?: string;
  details?: string;
  notes?: string;
}

function validateMetricsData(data: unknown): data is OpenLedgerMetricsRaw {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  const requiredFields = [
    "active_villagers",
    "monthly_contributions",
    "cash_on_hand",
    "monthly_operational_costs",
    "cash_deployed",
    "general_fund",
    "project_specific_fund",
    "one_time_total",
    "recurring_total",
    "total_contributions",
  ];

  const hasValidNumbers = requiredFields.every(
    (field) => typeof d[field] === "number" && !isNaN(d[field] as number)
  );

  const hasValidDataSource = typeof d.data_source === "string";

  const hasValidProjects =
    Array.isArray(d.recent_projects) &&
    (d.recent_projects as unknown[]).every(
      (project: unknown) =>
        project &&
        typeof project === "object" &&
        typeof (project as { title?: string }).title === "string" &&
        typeof (project as { slug?: string }).slug === "string" &&
        typeof (project as { status?: string }).status === "string"
    );

  return hasValidNumbers && hasValidDataSource && hasValidProjects;
}

export async function GET(_request: NextRequest) {
  try {
    const data = await getOpenLedgerMetricsPayload();

    if (!validateMetricsData(data)) {
      console.error("Invalid metrics aggregate shape:", data);
      return NextResponse.json(
        {
          error: true,
          success: false,
          message: "Invalid data format from metrics service",
        },
        { status: 500 }
      );
    }

    const metrics = data as OpenLedgerMetricsRaw;
    const currency = metrics.currency || "NGN";
    const cleaned = omit(metrics, ["data-source", "notes"]);

    const response = {
      ...cleaned,
      formatted: {
        active_villagers: cleaned.active_villagers.toLocaleString(),
        monthly_contributions: formatCurrency(
          cleaned.monthly_contributions,
          currency
        ),
        cash_on_hand: formatCurrency(cleaned.cash_on_hand, currency),
        monthly_operational_costs: formatCurrency(
          cleaned.monthly_operational_costs,
          currency
        ),
        cash_deployed: formatCurrency(cleaned.cash_deployed, currency),
        general_fund: formatCurrency(cleaned.general_fund, currency),
        project_specific_fund: formatCurrency(
          cleaned.project_specific_fund,
          currency
        ),
        one_time_total: formatCurrency(cleaned.one_time_total, currency),
        recurring_total: formatCurrency(cleaned.recurring_total, currency),
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=900, stale-while-revalidate=1800",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        error: true,
        success: false,
        message: "Internal server error",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
