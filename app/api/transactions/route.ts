import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { listTransactionsForAdmin } from "@/lib/repositories/transaction-repository";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("admin");
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get("pageIndex") || "0");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const globalFilter = searchParams.get("globalFilter") || "";
    const statusFilter = searchParams.get("payment_status") || "";
    const typeFilter = searchParams.get("payment_type") || "";
    const methodFilter = searchParams.get("payment_method") || "";
    const categoryFilter = searchParams.get("category") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const dateField = (searchParams.get("dateField") || "created_at") as
      | "created_at"
      | "paid_at";

    const { data: transactions, total } = await listTransactionsForAdmin({
      pageIndex,
      pageSize,
      globalFilter,
      statusFilter,
      typeFilter,
      methodFilter,
      categoryFilter,
      dateFrom,
      dateTo,
      dateField,
    });

    return NextResponse.json({
      data: transactions,
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
