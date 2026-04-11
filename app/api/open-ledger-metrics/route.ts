import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatCurrency, omit } from "@/lib/utils";
import { RecentProjectSummary } from "@/types/project";
import { NextRequest, NextResponse } from "next/server";

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
  recent_projects: RecentProjectSummary[];
  data_source: string;
  last_updated: string;
  currency: string;
  success: boolean;
  error?: boolean;
  message?: string;
  details?: string;
  notes?: string;
}

// Validation function
function validateMetricsData(data: any): data is OpenLedgerMetricsRaw {
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
    (field) => typeof data[field] === "number" && !isNaN(data[field])
  );

  const hasValidDataSource = typeof data.data_source === "string";

  const hasValidProjects =
    Array.isArray(data.recent_projects) &&
    data.recent_projects.every(
      (project: any) =>
        typeof project.title === "string" &&
        typeof project.slug === "string" &&
        typeof project.status === "string"
    );

  return hasValidNumbers && hasValidDataSource && hasValidProjects;
}

export async function GET(request: NextRequest) {
  try {
    // Call the Supabase function
    const { data, error } = await supabaseAdmin.rpc("get_open_ledger_metrics");

    if (error) {
      console.error("Supabase RPC error:", error);
      return NextResponse.json(
        {
          error: true,
          success: false,
          message: "Database connection failed",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    // Check if the function returned an error
    if (data?.error || !data?.success) {
      console.error("Function returned error:", data?.message);
      return NextResponse.json(
        {
          error: true,
          success: false,
          message: data?.message || "Function execution failed",
        },
        { status: 500 }
      );
    }

    // Validate the data structure
    if (!validateMetricsData(data)) {
      console.error("Invalid data structure received:", data);
      return NextResponse.json(
        {
          error: true,
          success: false,
          message: "Invalid data format received from database",
        },
        { status: 500 }
      );
    }

    const metrics = data as OpenLedgerMetricsRaw;

    // Use the currency from the database response
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

    // Cache headers for 15 minutes with stale-while-revalidate
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
