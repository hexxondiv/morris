import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import {
  listTransactionsForExport,
  mapTransactionAdminRow,
} from "@/lib/repositories/transaction-repository";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("admin");
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const globalFilter = searchParams.get("globalFilter") || "";
    const paymentStatus = searchParams.get("payment_status") || "";
    const paymentType = searchParams.get("payment_type") || "";
    const paymentMethod = searchParams.get("payment_method") || "";
    const category = searchParams.get("category") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const dateField = (searchParams.get("dateField") || "created_at") as
      | "created_at"
      | "paid_at";

    const rows = await listTransactionsForExport({
      pageIndex: 0,
      pageSize: 1,
      globalFilter,
      statusFilter: paymentStatus,
      typeFilter: paymentType,
      methodFilter: paymentMethod,
      categoryFilter: category,
      dateFrom,
      dateTo,
      dateField,
    });

    const total = rows.length;
    const data = rows.map((r) => mapTransactionAdminRow(r, total));

    const headers = [
      "ID",
      "Reference",
      "User Email",
      "User Name",
      "Payment Type",
      "Amount",
      "Currency",
      "Payment Method",
      "Status",
      "Category",
      "Paid At",
      "Created At",
    ];

    const csvRows = [
      headers.join(","),
      ...data.map((transaction) =>
        [
          transaction.id,
          transaction.payment_ref || "",
          transaction.profiles?.email || "",
          transaction.profiles
            ? `${transaction.profiles.first_name || ""} ${transaction.profiles.last_name || ""}`.trim()
            : "",
          transaction.payment_type,
          transaction.amount,
          transaction.currency,
          transaction.payment_method || "",
          transaction.payment_status,
          transaction.category || "",
          transaction.paid_at,
          transaction.created_at,
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=transactions.csv",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
