import { NextRequest, NextResponse } from "next/server";
import { capitalize } from "lodash";
import { requireRole } from "@/lib/auth/server";
import {
  listPledgesForExport,
  mapPledgeExportRow,
} from "@/lib/repositories/pledge-repository";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("admin");
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const globalFilter = searchParams.get("globalFilter") || "";
    const statusFilter = searchParams.get("status") || "";
    const pledgeTypeFilter = searchParams.get("pledge_type") || "";
    const recurrenceIntervalFilter =
      searchParams.get("recurrence_interval") || "";

    const rows = await listPledgesForExport({
      globalFilter,
      statusFilter,
      pledgeTypeFilter,
      recurrenceIntervalFilter,
    });

    const data = rows.map(mapPledgeExportRow);

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
      ...data.map((pledge) =>
        [
          pledge.id,
          pledge.profiles?.email || "",
          pledge.profiles
            ? `${capitalize(pledge.profiles.first_name || "")} ${capitalize(pledge.profiles.last_name || "")}`.trim()
            : "",
          pledge.projects?.title || "",
          pledge.amount,
          pledge.pledge_type,
          pledge.recurrence_interval || "",
          pledge.payment_day || "",
          pledge.status,
          pledge.created_at,
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
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
