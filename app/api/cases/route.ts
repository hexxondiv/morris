import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { listCasesForAdmin } from "@/lib/repositories/case-repository";

/**
 * GET /api/cases
 * Fetches cases with pagination and filters for admin table
 */
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireRole("moderator");
    if (!authCheck.authorized) return authCheck.response;

    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get("pageIndex") || "0");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const globalFilter = searchParams.get("globalFilter") || "";
    const statusFilter = searchParams.get("status") || "";
    const helpTypeFilter = searchParams.get("help_type") || "";
    const stateFilter = searchParams.get("state_id") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const { data, total } = await listCasesForAdmin({
      pageIndex,
      pageSize,
      globalFilter,
      statusFilter,
      helpTypeFilter,
      stateFilter,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      data,
      total,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
