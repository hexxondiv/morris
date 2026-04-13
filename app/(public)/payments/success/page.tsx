"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type VerifyUiState = "idle" | "loading" | "success" | "pending" | "failed";

type VerifyResponse = {
  ok: boolean;
  verificationState?: "success" | "pending" | "failed";
  transactionStatus?: string;
  gatewayStatus?: string;
  amountPaid?: number;
  error?: string;
};

type StatusConfig = {
  title: string;
  tone: string;
  badge: string;
  helper: string;
  icon: JSX.Element;
};

function PaymentsSuccessContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerifyUiState>("idle");
  const [message, setMessage] = useState<string>(
    "Preparing payment verification..."
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number | null>(null);

  const txRef = useMemo(() => {
    return (
      searchParams.get("txRef") ||
      searchParams.get("tx_ref") ||
      searchParams.get("txref") ||
      searchParams.get("reference") ||
      ""
    ).trim();
  }, [searchParams]);

  const paymentType = (searchParams.get("paymentType") || "pledge").toLowerCase();

  const verifyPayment = async (isManualRetry = false) => {
    if (!txRef) {
      setState("failed");
      setMessage(
        "We could not find a transaction reference in the callback. Please return to your dashboard and retry verification."
      );
      return;
    }

    if (isManualRetry) setIsRetrying(true);
    setState("loading");
    setMessage("Verifying your payment with Switch...");

    try {
      const res = await fetch("/api/payments/switchapp/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txRef }),
      });

      const body = (await res.json().catch(() => ({}))) as VerifyResponse;
      setAmountPaid(typeof body.amountPaid === "number" ? body.amountPaid : null);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setState("failed");
          setMessage("Please sign in to verify this payment.");
          return;
        }
        setState("failed");
        setMessage(body.error || "Payment verification failed. Please try again.");
        return;
      }

      if (body.verificationState === "success") {
        setState("success");
        setMessage("Payment verified successfully. Thank you for your support.");
        return;
      }

      if (body.verificationState === "pending") {
        setState("pending");
        setMessage(
          "Your payment is received but still pending confirmation. Please retry in a few seconds."
        );
        return;
      }

      setState("failed");
      setMessage(
        body.error ||
          `Payment is currently ${body.gatewayStatus || "unconfirmed"}. If debited, contact support with your reference.`
      );
    } catch {
      setState("failed");
      setMessage(
        "Network error while verifying payment. Please check your connection and try again."
      );
    } finally {
      if (isManualRetry) setIsRetrying(false);
    }
  };

  useEffect(() => {
    void verifyPayment();
  }, [txRef]);

  const statusConfig: StatusConfig = {
    idle: {
      title: "Payment Update",
      tone: "text-gray-700 dark:text-gray-200",
      badge: "Awaiting verification",
      helper: "We are preparing your payment details.",
      icon: <ShieldCheck className="h-7 w-7 text-theme-600 dark:text-theme-400" />,
    },
    loading: {
      title: "Verifying Payment",
      tone: "text-theme-700 dark:text-theme-300",
      badge: "Processing",
      helper: "This usually takes a few seconds.",
      icon: <Loader2 className="h-7 w-7 animate-spin text-theme-600 dark:text-theme-400" />,
    },
    success: {
      title: "Payment Successful",
      tone: "text-emerald-700 dark:text-emerald-300",
      badge: "Confirmed",
      helper: "Your contribution has been recorded.",
      icon: <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />,
    },
    pending: {
      title: "Payment Pending",
      tone: "text-amber-700 dark:text-amber-300",
      badge: "Awaiting confirmation",
      helper: "We have your payment attempt and are waiting for final gateway confirmation.",
      icon: <Clock3 className="h-7 w-7 text-amber-600 dark:text-amber-400" />,
    },
    failed: {
      title: "Verification Issue",
      tone: "text-red-700 dark:text-red-300",
      badge: "Action needed",
      helper: "Please retry verification or contact support with your reference.",
      icon: <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />,
    },
  }[state];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-theme-50/60 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-theme-200/30 blur-3xl dark:bg-theme-900/20" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-theme-300/20 blur-3xl dark:bg-theme-700/10" />

      <section className="relative w-full max-w-2xl rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-xl p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-theme-50 dark:bg-theme-900/40 px-3 py-1.5 text-xs font-medium text-theme-700 dark:text-theme-300 border border-theme-200/70 dark:border-theme-800/80">
            <ShieldCheck className="h-3.5 w-3.5" />
            Switch Payment Verification
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date().toLocaleTimeString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 bg-gradient-to-b from-white to-gray-50/70 dark:from-gray-900 dark:to-gray-950/50">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
              {statusConfig.icon}
            </div>
            <div>
              <p className={`text-lg font-semibold ${statusConfig.tone}`}>{statusConfig.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{statusConfig.badge}</p>
            </div>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-200">{message}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{statusConfig.helper}</p>

          <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Transaction reference
            </p>
            <p className="mt-1 break-all font-mono text-xs text-gray-700 dark:text-gray-200">
              {txRef || "Unavailable"}
            </p>
          </div>

          {state === "success" && amountPaid != null && (
            <div className="mt-3 rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Amount paid
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                {new Intl.NumberFormat("en-NG", {
                  style: "currency",
                  currency: "NGN",
                }).format(amountPaid)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
          {(state === "pending" || state === "failed") && (
            <Button
              variant="outline"
              onClick={() => void verifyPayment(true)}
              disabled={isRetrying}
              className="sm:flex-1"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                "Retry Verification"
              )}
            </Button>
          )}

          <Button asChild variant="outline" className="sm:flex-1">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>

          <Button asChild className="sm:flex-1">
            <Link href={paymentType === "donation" ? "/pledge" : "/projects"}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

export default function PaymentsSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-theme-500" />
        </main>
      }
    >
      <PaymentsSuccessContent />
    </Suspense>
  );
}
