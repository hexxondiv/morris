import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserRoleFromClerk } from "@/lib/actions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/clerk";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole('admin');
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const globalFilter = searchParams.get("globalFilter") || "";
    const paymentStatus = searchParams.get("payment_status") || "";
    const paymentType = searchParams.get("payment_type") || "";
    const paymentMethod = searchParams.get("payment_method") || "";
    const category = searchParams.get("category") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const dateField = searchParams.get("dateField") || "created_at";

    // Build the same query as the main route but without pagination
    let query = supabaseAdmin
      .from("transactions")
      .select(`
        id,
        pledge_id,
        user_id,
        payment_type,
        amount,
        currency,
        payment_method,
        payment_status,
        payment_ref,
        paid_at,
        created_at,
        category,
        profiles:user_id (
          email,
          first_name,
          last_name
        )
      `);

    // Apply same filters as main route
    if (globalFilter) {
      query = query.or(`
        payment_ref.ilike.%${globalFilter}%,
        user_id.ilike.%${globalFilter}%,
        profiles.email.ilike.%${globalFilter}%,
        profiles.first_name.ilike.%${globalFilter}%,
        profiles.last_name.ilike.%${globalFilter}%,
        payment_type.ilike.%${globalFilter}%,
        payment_status.ilike.%${globalFilter}%
      `);
    }

    if (paymentStatus) query = query.eq("payment_status", paymentStatus);
    if (paymentType) query = query.eq("payment_type", paymentType);
    if (paymentMethod) query = query.eq("payment_method", paymentMethod);
    if (category) query = query.eq("category", category);
    if (dateFrom) query = query.gte(dateField, dateFrom);
    if (dateTo) query = query.lte(dateField, dateTo);

    const { data, error } = await query.order(dateField, { ascending: false });

    if (error) {
      console.error("Export error:", error);
      return NextResponse.json({ error: "Failed to export transactions" }, { status: 500 });
    }

    // Convert to CSV
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
      ...(data || []).map((transaction: any) =>
        [
          transaction.id,
          transaction.payment_ref || "",
          transaction.profiles?.email || "",
          transaction.profiles ? 
            `${transaction.profiles.first_name || ""} ${transaction.profiles.last_name || ""}`.trim() :
            "",
          transaction.payment_type,
          transaction.amount,
          transaction.currency,
          transaction.payment_method || "",
          transaction.payment_status,
          transaction.category || "",
          transaction.paid_at,
          transaction.created_at,
        ]
        .map(field => `"${String(field).replace(/"/g, '""')}"`) // Escape CSV
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
