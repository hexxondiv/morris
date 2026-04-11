import { NextResponse } from "next/server";
import {
  applySwitchappChargeOutcome,
  type SwitchappWebhookMetadata,
} from "@/lib/services/switchapp-webhook-service";

interface WebhookData {
  event: string;
  data: {
    id: string;
    status: string;
    metadata: string;
    gateway_code?: string;
    tx_ref: string;
    amount: number;
    paid_at?: string;
  };
}

const VALID_EVENTS = [
  "charge.successful",
  "charge.failed",
  "charge.pending",
  "charge.refunded",
];

const logAudit = (message: string, details?: Record<string, unknown>) => {
  console.log(
    `[Webhook Audit] ${message}`,
    details ? JSON.stringify(details, null, 2) : ""
  );
};

const handleError = (message: string, error: unknown, status = 500) => {
  console.error(`[Webhook Error] ${message}:`, error);
  return NextResponse.json({ error: message }, { status });
};

export async function POST(request: Request) {
  try {
    const body: WebhookData = await request.json();
    logAudit("Received webhook", body as unknown as Record<string, unknown>);

    const { event, data } = body;
    if (!VALID_EVENTS.includes(event)) {
      logAudit(`Ignoring event: ${event}`);
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    const {
      status,
      metadata: metadataString,
      gateway_code: paymentChannel,
      tx_ref,
      amount,
      paid_at,
    } = data;

    if (!tx_ref || !status || !amount || amount <= 0) {
      return handleError(
        "Missing or invalid required fields",
        new Error("Invalid webhook data"),
        400
      );
    }

    let metadata: SwitchappWebhookMetadata;
    try {
      metadata = JSON.parse(metadataString);
      if (!metadata?.userId || !metadata?.paymentType) {
        return handleError(
          "Missing required metadata",
          new Error("Invalid metadata"),
          400
        );
      }
    } catch (parseError) {
      return handleError("Invalid metadata format", parseError, 400);
    }

    await applySwitchappChargeOutcome({
      txRef: tx_ref,
      gatewayStatus: status,
      paymentChannel,
      metadata,
      switchappEvent: event,
      paidAt: paid_at,
      amount,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    return handleError("Webhook processing failed", error);
  }
}
