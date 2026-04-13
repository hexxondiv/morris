import { NextResponse } from "next/server";
import { z } from "zod";
import { TransactionKind } from "@prisma/client";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { verifySwitchTransactionByRef } from "@/lib/services/switchapp-api-client";
import {
  applySwitchappChargeOutcome,
  parseChargeMetadataFromSwitch,
} from "@/lib/services/switchapp-webhook-service";

const bodySchema = z.object({
  transactionId: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireRole("admin");
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

  const { transactionId } = parsed.data;

  const txn = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      kind: true,
      userId: true,
      pledgeId: true,
      paymentReference: true,
    },
  });
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  if (txn.kind !== TransactionKind.PLEDGE) {
    return NextResponse.json(
      { error: "Re-query Switch is only available for pledge transactions" },
      { status: 400 }
    );
  }
  const txRef = txn.paymentReference;
  if (!txRef) {
    return NextResponse.json(
      {
        error:
          "This transaction has no Switch payment reference (e.g. manual admin completion).",
      },
      { status: 400 }
    );
  }
  if (!txn.userId) {
    return NextResponse.json(
      { error: "Transaction has no user; cannot verify Switch metadata" },
      { status: 400 }
    );
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
  if (metadata.userId !== txn.userId) {
    return NextResponse.json(
      { error: "Switch metadata does not match this transaction’s user" },
      { status: 403 }
    );
  }

  try {
    await applySwitchappChargeOutcome({
      txRef,
      gatewayStatus: verify.data.status,
      paymentChannel: verify.data.gateway_code ?? undefined,
      metadata,
      switchappEvent: "verify.api.admin",
      paidAt: verify.data.paid_at ?? undefined,
      amount: verify.data.amount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Apply outcome failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const [pledgeAfter, txnAfter] = await Promise.all([
    txn.pledgeId
      ? prisma.pledge.findUnique({
          where: { id: txn.pledgeId },
          select: { status: true },
        })
      : Promise.resolve(null),
    prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { status: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    switchStatus: verify.data.status,
    pledgeStatus: pledgeAfter?.status.toLowerCase() ?? null,
    transactionStatus: txnAfter?.status.toLowerCase() ?? null,
  });
}
