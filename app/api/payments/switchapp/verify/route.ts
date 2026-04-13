import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifySwitchTransactionByRef } from "@/lib/services/switchapp-api-client";
import {
  applySwitchappChargeOutcome,
  parseChargeMetadataFromSwitch,
} from "@/lib/services/switchapp-webhook-service";
import { TransactionStatus } from "@prisma/client";

const bodySchema = z.object({
  txRef: z.string().trim().min(3).max(200),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { txRef } = parsed.data;

  const byRef = await prisma.transaction.findFirst({
    where: { paymentReference: txRef },
    select: { id: true, userId: true },
  });
  if (!byRef) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  if (!byRef.userId) {
    return NextResponse.json(
      { error: "Transaction has no user; cannot verify" },
      { status: 400 }
    );
  }
  const ownerUserId = byRef.userId;

  const verify = await verifySwitchTransactionByRef(txRef);
  if (!verify.ok) {
    const status =
      verify.status >= 400 && verify.status < 600 ? verify.status : 502;
    return NextResponse.json({ error: verify.message }, { status });
  }

  const metadata = parseChargeMetadataFromSwitch(verify.data.metadata);
  if (!metadata) {
    return NextResponse.json(
      { error: "Switch verify returned metadata we could not parse" },
      { status: 502 }
    );
  }
  if (metadata.userId !== ownerUserId) {
    return NextResponse.json(
      { error: "Switch metadata does not match this transaction’s user" },
      { status: 403 }
    );
  }

  try {
    // Always use the ref we matched in DB. Switch verify may return a different `tx_ref`
    // string than we stored; `applySwitchappChargeOutcome` looks up by `payment_reference`.
    await applySwitchappChargeOutcome({
      txRef,
      gatewayStatus: verify.data.status,
      paymentChannel: verify.data.gateway_code ?? undefined,
      metadata,
      switchappEvent: "verify.api",
      paidAt: verify.data.paid_at ?? undefined,
      amount: verify.data.amount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Apply outcome failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const updated = await prisma.transaction.findUnique({
    where: { id: byRef.id },
    select: { status: true },
  });

  const transactionStatus = updated?.status ?? TransactionStatus.PENDING;
  const verificationState =
    transactionStatus === TransactionStatus.COMPLETED
      ? "success"
      : transactionStatus === TransactionStatus.PENDING
        ? "pending"
        : "failed";

  return NextResponse.json({
    ok: verificationState === "success",
    verificationState,
    transactionStatus,
    gatewayStatus: verify.data.status,
    amountPaid: verify.data.amount,
    txRef,
  });
}
