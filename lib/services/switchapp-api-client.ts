/**
 * Server-side SwitchApp Merchant API (secret key). Used for transaction verify.
 * @see https://docs.switchappgo.com/payments/transactions/verify-transaction
 */

const SWITCHAPP_API_BASE = "https://api.switchappgo.com";

/** Uses console.error so logs appear under Next production `removeConsole` (only `error` kept). */
export function switchVerifyLog(
  message: string,
  details?: Record<string, unknown>
) {
  if (details && Object.keys(details).length > 0) {
    console.error(`[Switch verify] ${message}`, JSON.stringify(details));
  } else {
    console.error(`[Switch verify] ${message}`);
  }
}

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
  const parsePositive = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  };

  // Prefer gross customer-paid amount over net settlement (which may exclude fees).
  const preferredOrder = [d.amount_paid, d.amount, d.charged_amount];
  for (const v of preferredOrder) {
    const parsed = parsePositive(v);
    if (parsed != null) return parsed;
  }

  // Defensive fallback: if providers return multiple amount fields, keep the highest.
  const fallbackValues = [d.amount_paid, d.amount, d.charged_amount]
    .map(parsePositive)
    .filter((n): n is number => n != null);
  if (fallbackValues.length > 0) return Math.max(...fallbackValues);

  return null;
}

export async function verifySwitchTransactionByRef(
  txRef: string
): Promise<SwitchVerifyTransactionResult> {
  switchVerifyLog("Switch API: starting verify request", { txRef });

  const secret = process.env.SWITCHAPP_SECRET_KEY?.trim();
  if (!secret) {
    switchVerifyLog("Switch API: abort — SWITCHAPP_SECRET_KEY not set");
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
    switchVerifyLog("Switch API: fetch failed", { txRef, error: msg });
    return { ok: false, status: 502, message: msg };
  }

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  switchVerifyLog("Switch API: HTTP response", {
    txRef,
    httpStatus: res.status,
    ok: res.ok,
    body: json,
  });

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
    switchVerifyLog("Switch API: envelope success but data missing/invalid", {
      txRef,
      json,
    });
    return { ok: false, status: 502, message: "Switch verify missing data" };
  }

  const ref =
    typeof data.tx_ref === "string" && data.tx_ref.trim()
      ? data.tx_ref.trim()
      : txRef;
  const status = typeof data.status === "string" ? data.status : "";
  const amount = pickPositiveAmount(data);
  if (!status || amount == null) {
    switchVerifyLog("Switch API: could not derive status or amount", {
      txRef,
      dataKeys: Object.keys(data),
      data,
    });
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

  const normalized = {
    tx_ref: ref,
    status,
    gateway_code,
    metadata,
    paid_at,
    amount,
  };

  switchVerifyLog("Switch API: normalized success payload", {
    txRef,
    normalized,
  });

  return {
    ok: true,
    data: normalized,
  };
}
