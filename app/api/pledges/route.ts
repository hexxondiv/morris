import { insertDevProfile } from "@/lib/actions/users";
import { requireAuth, requireRole } from "@/lib/auth/server";
import {
  listPledgesForAdmin,
  mapPledgeAdminTableRow,
} from "@/lib/repositories/pledge-repository";
import { createPendingPledge } from "@/lib/services/pledge-service";
import { pledgeSchema } from "@/lib/zod-schema";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requireRole("admin");
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const pageIndex = parseInt(searchParams.get("pageIndex") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const globalFilter = searchParams.get("globalFilter") || "";
  const statusFilter = searchParams.get("status") || "";
  const pledgeTypeFilter = searchParams.get("pledge_type") || "";
  const recurrenceIntervalFilter = searchParams.get("recurrence_interval") || "";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const dateField =
    searchParams.get("dateField") === "updated_at" ? "updated_at" : "created_at";

  try {
    const { rows, total } = await listPledgesForAdmin({
      pageIndex,
      pageSize,
      globalFilter,
      statusFilter,
      pledgeTypeFilter,
      recurrenceIntervalFilter,
      dateFrom,
      dateTo,
      dateField,
    });

    const pledges = rows.map(mapPledgeAdminTableRow);

    return NextResponse.json({
      data: pledges,
      total,
    });
  } catch (error) {
    console.error("Error fetching pledges:", error);
    return NextResponse.json({ error: "Failed to fetch pledges" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const parseResult = pledgeSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors }, { status: 400 });
  }

  const { amount, pledgeType, recurrenceInterval, paymentDay, projectId } =
    parseResult.data;

  try {
    const result = await createPendingPledge({
      userId: auth.userId,
      amount,
      pledgeType,
      recurrenceInterval: recurrenceInterval ?? undefined,
      paymentDay: paymentDay ?? undefined,
      projectId: projectId ?? undefined,
    });

    if ("error" in result) {
      const status = result.error === "Invalid project ID" ? 400 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ pledgeId: result.pledgeId }, { status: 200 });
  } catch (error: unknown) {
    console.error("Pledge creation failed:", error);
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2003"
        ? "P2003"
        : null;

    if (code === "P2003" && process.env.NODE_ENV === "development") {
      await insertDevProfile(auth.userId);
      const retry = await createPendingPledge({
        userId: auth.userId,
        amount,
        pledgeType,
        recurrenceInterval: recurrenceInterval ?? undefined,
        paymentDay: paymentDay ?? undefined,
        projectId: projectId ?? undefined,
      });
      if ("error" in retry) {
        return NextResponse.json({ error: retry.error }, { status: 500 });
      }
      return NextResponse.json({ pledgeId: retry.pledgeId }, { status: 200 });
    }

    return NextResponse.json({ error: "Failed to create pledge" }, { status: 500 });
  }
}
