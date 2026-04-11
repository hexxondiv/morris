import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireRole } from "@/lib/auth/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: txnId } = await params;
    const auth = await requireRole('admin');
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const { payment_status } = body;

    // Validate payment_status
    const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'cancelled'];
    if (!validStatuses.includes(payment_status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .update({
        payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", txnId)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}