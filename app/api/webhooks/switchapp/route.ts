import { NextResponse } from "next/server";
import {
  applySwitchappChargeOutcome,
  parseChargeMetadataFromSwitch,
} from "@/lib/services/switchapp-webhook-service";

type WebhookData = {
  event: string;
  data: {
    id?: string;
    status: string;
    /** Switch sample schema uses string; some deliveries may send a parsed object. */
    metadata: string | Record<string, unknown> | null;
    gateway_code?: string;
    tx_ref: string;
    /** Primary amount; fallbacks match Switch sample `ViewEventTransactionDto`. */
    amount?: number;
    charged_amount?: number;
    amount_paid?: number;
    paid_at?: string;
  };
};

function coercePositiveAmount(data: WebhookData["data"]): number | null {
  const candidates: unknown[] = [
    data.amount,
    data.charged_amount,
    data.amount_paid,
  ];
  for (const v of candidates) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
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

/** Lets you hit the URL in a browser or `curl` through ngrok to confirm routing. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Switch webhook endpoint - SwitchApp should POST charge.* events here.",
  });
}

export async function POST(request: Request) {
  try {
    const body: WebhookData = await request.json();
    logAudit("Received webhook", body as unknown as Record<string, unknown>);

    const { event, data } = body;
    if (!data || typeof data !== "object") {
      return handleError("Missing data object", new Error("Invalid webhook body"), 400);
    }

    if (!VALID_EVENTS.includes(event)) {
      logAudit(`Ignoring event: ${event}`);
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    const {
      status,
      metadata: metadataRaw,
      gateway_code: paymentChannel,
      tx_ref,
      paid_at,
    } = data;

    const amount = coercePositiveAmount(data);
    if (!tx_ref || !status || amount == null) {
      return handleError(
        "Missing or invalid required fields",
        new Error("Invalid webhook data"),
        400
      );
    }

    const metadata = parseChargeMetadataFromSwitch(metadataRaw);
    if (!metadata) {
      return handleError(
        "Missing required metadata",
        new Error("Invalid metadata"),
        400
      );
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
