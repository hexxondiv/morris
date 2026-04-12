/**
 * Server-side SwitchApp Merchant API (secret key). Used for transaction verify.
 * @see https://docs.switchappgo.com/payments/transactions/verify-transaction
 */

const SWITCHAPP_API_BASE = "https://api.switchappgo.com";

export type SwitchVerifyTransactionData = {
  tx_ref: string;
  status: string;
  gateway_code?: string | null;
  metadata: string | null;
  paid_at?: string | null;
  amount: number;
};

export type SwitchVerifyTransactionResult =
  | { ok: true; data: SwitchVerifyTransactionData }
  | { ok: false; status: number; message: string };

function pickPositiveAmount(d: Record<string, unknown>): number | null {
  const candidates = [d.charged_amount, d.amount, d.amount_paid];
  for (const v of candidates) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

export async function verifySwitchTransactionByRef(
  txRef: string
): Promise<SwitchVerifyTransactionResult> {
  const secret = process.env.SWITCHAPP_SECRET_KEY?.trim();
  if (!secret) {
    return {
      ok: false,
      status: 500,
      message: "SWITCHAPP_SECRET_KEY is not configured",
    };
  }

  const url = `${SWITCHAPP_API_BASE}/v1/transactions/verify/${encodeURIComponent(txRef)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 502, message: msg };
  }

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const message =
      (typeof json?.message === "string" && json.message) ||
      `Switch verify HTTP ${res.status}`;
    return { ok: false, status: res.status, message };
  }

  if (!json || json.status !== "success") {
    const message =
      (typeof json?.message === "string" && json.message) ||
      "Switch verify returned non-success";
    return { ok: false, status: 502, message };
  }

  const data = json.data as Record<string, unknown> | null | undefined;
  if (!data || typeof data !== "object") {
    return { ok: false, status: 502, message: "Switch verify missing data" };
  }

  const ref =
    typeof data.tx_ref === "string" && data.tx_ref.trim()
      ? data.tx_ref.trim()
      : txRef;
  const status = typeof data.status === "string" ? data.status : "";
  const amount = pickPositiveAmount(data);
  if (!status || amount == null) {
    return { ok: false, status: 502, message: "Switch verify response missing status or amount" };
  }

  const metadata =
    typeof data.metadata === "string"
      ? data.metadata
      : data.metadata != null
        ? JSON.stringify(data.metadata)
        : null;

  const gateway_code =
    typeof data.gateway_code === "string" ? data.gateway_code : undefined;
  const paid_at =
    typeof data.paid_at === "string"
      ? data.paid_at
      : data.paid_at != null
        ? String(data.paid_at)
        : null;

  return {
    ok: true,
    data: {
      tx_ref: ref,
      status,
      gateway_code,
      metadata,
      paid_at,
      amount,
    },
  };
}
