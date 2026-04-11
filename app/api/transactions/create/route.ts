import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { createLedgerTransaction } from "@/lib/services/transaction-write-service";
import { transactionSchema } from "@/lib/zod-schema";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const parseResult = transactionSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid transaction data",
        details: parseResult.error.errors,
      },
      { status: 400 }
    );
  }

  const {
    amount,
    pledgeId,
    paymentType,
    projectId,
    currency,
    chartId,
    description,
    paymentRef,
    timelineStageId,
  } = parseResult.data;

  const result = await createLedgerTransaction({
    userId: auth.userId,
    amount,
    pledgeId,
    paymentType,
    projectId,
    currency,
    chartId,
    description,
    paymentRef,
    timelineStageId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      txRef: result.txRef,
      transactionId: result.transactionId,
      message: "Transaction created successfully",
    },
    { status: 200 }
  );
}
