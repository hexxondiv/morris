import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserRoleFromClerk } from "@/lib/actions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { capitalize } from "lodash";
import { requireRole } from "@/lib/clerk";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole('admin');
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const globalFilter = searchParams.get("globalFilter") || "";
    const statusFilter = searchParams.get("status") || "";
    const pledgeTypeFilter = searchParams.get("pledge_type") || "";
    const recurrenceIntervalFilter = searchParams.get("recurrence_interval") || "";

    // Build the same query as the main route but without pagination
    let query = supabaseAdmin
      .from("pledges")
      .select(`
        id,
        user_id,
        project_id,
        amount,
        pledge_type,
        recurrence_interval,
        payment_day,
        status,
        created_at,
        profiles:user_id (
          email,
          first_name,
          last_name
        ),
        projects:project_id (
          title
        )
      `);

    // Apply same filters as main route
    if (globalFilter) {
      query = query.or(`
        profiles.email.ilike.%${globalFilter}%,
        profiles.first_name.ilike.%${globalFilter}%,
        profiles.last_name.ilike.%${globalFilter}%,
        projects.title.ilike.%${globalFilter}%,
        status.ilike.%${globalFilter}%
      `);
    }

    if (statusFilter) query = query.eq("status", statusFilter);
    if (pledgeTypeFilter) query = query.eq("pledge_type", pledgeTypeFilter);
    if (recurrenceIntervalFilter) query = query.eq("recurrence_interval", recurrenceIntervalFilter);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Export error:", error);
      return NextResponse.json({ error: "Failed to export pledges" }, { status: 500 });
    }

    // Convert to CSV
    const headers = [
      "ID",
      "User Email",
      "User Name", 
      "Project",
      "Amount",
      "Pledge Type",
      "Recurrence Interval",
      "Payment Day",
      "Status",
      "Created At",
    ];

    const csvRows = [
      headers.join(","),
      ...(data || []).map((pledge: any) =>
        [
          pledge.id,
          pledge.profiles?.email || "",
          pledge.profiles ? 
            `${capitalize(pledge.profiles.first_name || "")} ${capitalize(pledge.profiles.last_name || "")}`.trim() : 
            "",
          pledge.projects?.title || "",
          pledge.amount,
          pledge.pledge_type,
          pledge.recurrence_interval || "",
          pledge.payment_day || "",
          pledge.status,
          pledge.created_at,
        ]
        .map(field => `"${String(field).replace(/"/g, '""')}"`) // Escape CSV
        .join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=pledges.csv",
      },
    });

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}