import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { verifySwitchTransactionByRef } from "@/lib/services/switchapp-api-client";
import {
  applySwitchappChargeOutcome,
  parseChargeMetadataFromSwitch,
} from "@/lib/services/switchapp-webhook-service";
import { TransactionStatus } from "@prisma/client";

const bodySchema = z.object({
  txRef: z.string().min(3).max(200),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

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

  const owned = await prisma.transaction.findFirst({
    where: {
      paymentReference: txRef,
      userId: auth.userId,
    },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

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
  if (metadata.userId !== auth.userId) {
    return NextResponse.json(
      { error: "Transaction metadata does not match signed-in user" },
      { status: 403 }
    );
  }

  try {
    await applySwitchappChargeOutcome({
      txRef: verify.data.tx_ref,
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

  const updated = await prisma.transaction.findFirst({
    where: {
      paymentReference: txRef,
      userId: auth.userId,
    },
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
