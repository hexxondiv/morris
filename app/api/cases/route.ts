import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/clerk";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/cases
 * Fetches cases with pagination and filters for admin table
 */
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireRole("moderator");
    console.log(authCheck);
    if (!authCheck.authorized) return authCheck.response;

    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get("pageIndex") || "0");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const globalFilter = searchParams.get("globalFilter") || "";

    // Get filter parameters
    const statusFilter = searchParams.get("status") || "";
    const helpTypeFilter = searchParams.get("help_type") || "";
    const stateFilter = searchParams.get("state_id") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("cases")
      .select(
        `
        id,
        case_reference_id,
        full_name,
        phone,
        email,
        state_id,
        lga_id,
        town,
        reporting_for,
        beneficiary_name,
        relationship,
        help_type,
        description,
        info_confirmed,
        contact_consent,
        updates_consent,
        user_id,
        status,
        created_at,
        updated_at,
        states!inner(name),
        lgas!inner(name)
      `,
        { count: "exact" }
      );

    // Apply global search filter
    if (globalFilter) {
      query = query.or(`
        case_reference_id.ilike.%${globalFilter}%,
        full_name.ilike.%${globalFilter}%,
        phone.ilike.%${globalFilter}%,
        email.ilike.%${globalFilter}%,
        description.ilike.%${globalFilter}%,
        town.ilike.%${globalFilter}%
      `);
    }

    // Apply specific filters
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (helpTypeFilter) {
      query = query.eq("help_type", helpTypeFilter);
    }

    if (stateFilter) {
      query = query.eq("state_id", parseInt(stateFilter));
    }

    // Apply date range filter
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      // Add one day to include the entire end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt("created_at", endDate.toISOString());
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching cases:", error);
      return NextResponse.json(
        { error: "Failed to fetch cases" },
        { status: 500 }
      );
    }

    // Transform data to include state/lga names
    const transformedData = (data || []).map((caseItem: any) => ({
      ...caseItem,
      state_name: caseItem.states?.name || "Unknown",
      lga_name: caseItem.lgas?.name || "Unknown",
    }));

    return NextResponse.json({
      data: transformedData,
      total: count || 0,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
