import { NextRequest, NextResponse } from "next/server";
import {
  parseTransactionStatusFromApi,
  updateTransactionStatusById,
} from "@/lib/repositories/transaction-repository";
import { requireRole } from "@/lib/auth/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: txnId } = await params;
    const auth = await requireRole("admin");
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const { payment_status } = body;

    const validStatuses = [
      "pending",
      "completed",
      "failed",
      "refunded",
      "cancelled",
    ];
    if (!validStatuses.includes(payment_status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }

    const prismaStatus = parseTransactionStatusFromApi(payment_status);
    if (!prismaStatus) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }

    const data = await updateTransactionStatusById(txnId, prismaStatus);
    if (!data) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
