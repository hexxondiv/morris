import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserRoleFromClerk } from "@/lib/actions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole('admin');
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get("pageIndex") || "0");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const globalFilter = searchParams.get("globalFilter") || "";
    
    // Get all filter parameters
    const statusFilter = searchParams.get("payment_status") || "";
    const typeFilter = searchParams.get("payment_type") || "";
    const methodFilter = searchParams.get("payment_method") || "";
    const categoryFilter = searchParams.get("category") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const dateField = searchParams.get("dateField") || "created_at";

    // Single function call with all parameters
    const { data, error } = await supabaseAdmin.rpc("get_transactions", {
      page_index: pageIndex,
      page_size: pageSize,
      global_filter: globalFilter || null,
      status_filter: statusFilter || null,
      type_filter: typeFilter || null,
      method_filter: methodFilter || null,
      category_filter: categoryFilter || null,
      date_from: dateFrom || null,
      date_to: dateTo || null,
      date_field: dateField
    });

    if (error) {
      console.error("Database function error:", error);
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    // Data is already in the correct format
    const transactions = data || [];
    const total = transactions[0]?.total_count || 0;

    return NextResponse.json({
      data: transactions,
      total,
    });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}