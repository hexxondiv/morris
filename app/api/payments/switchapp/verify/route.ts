import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  switchVerifyLog,
  verifySwitchTransactionByRef,
} from "@/lib/services/switchapp-api-client";
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
    switchVerifyLog("route: invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    switchVerifyLog("route: body validation failed", {
      issues: parsed.error.flatten(),
    });
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { txRef } = parsed.data;
  switchVerifyLog("route: POST /api/payments/switchapp/verify", { txRef });

  const byRef = await prisma.transaction.findFirst({
    where: { paymentReference: txRef },
    select: { id: true, userId: true },
  });
  if (!byRef) {
    switchVerifyLog("route: no transaction row for payment_reference", {
      txRef,
    });
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  if (!byRef.userId) {
    switchVerifyLog("route: transaction has null user_id", {
      txRef,
      transactionId: byRef.id,
    });
    return NextResponse.json(
      { error: "Transaction has no user; cannot verify" },
      { status: 400 }
    );
  }
  const ownerUserId = byRef.userId;
  switchVerifyLog("route: DB transaction matched", {
    txRef,
    transactionId: byRef.id,
    ownerUserId,
  });

  const verify = await verifySwitchTransactionByRef(txRef);
  if (!verify.ok) {
    switchVerifyLog("route: Switch verify failed", {
      txRef,
      status: verify.status,
      message: verify.message,
    });
    const status =
      verify.status >= 400 && verify.status < 600 ? verify.status : 502;
    return NextResponse.json({ error: verify.message }, { status });
  }

  const metadata = parseChargeMetadataFromSwitch(verify.data.metadata);
  if (!metadata) {
    switchVerifyLog("route: metadata parse failed", {
      txRef,
      rawMetadata: verify.data.metadata,
    });
    return NextResponse.json(
      { error: "Switch verify returned metadata we could not parse" },
      { status: 502 }
    );
  }
  if (metadata.userId !== ownerUserId) {
    switchVerifyLog("route: metadata userId mismatch", {
      txRef,
      ownerUserId,
      metadataUserId: metadata.userId,
    });
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
    switchVerifyLog("route: applySwitchappChargeOutcome OK", { txRef });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Apply outcome failed";
    switchVerifyLog("route: applySwitchappChargeOutcome threw", {
      txRef,
      error: message,
    });
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

  const responseBody = {
    ok: verificationState === "success",
    verificationState,
    transactionStatus,
    gatewayStatus: verify.data.status,
    amountPaid: verify.data.amount,
    txRef,
  };
  switchVerifyLog("route: success — response", responseBody);

  return NextResponse.json(responseBody);
}
