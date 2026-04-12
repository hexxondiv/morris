"use client"

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ProjectSchema } from "./zod-schema";

// Define types for the payment details and parameters
interface Customer {
  full_name: string;
  email: string;
}

interface Metadata {
  userId: string;
  pledgeId: string;
  paymentType: "donation" | "pledge";
  projectId?: string;
}

interface PaymentDetails {
  country: string;
  currency: string;
  amount: number;
  customer: Customer;
  title: string;
  logo_url?: string;
  description: string;
  tx_ref: string;
  public_key: string;
  metadata: Metadata;
  callback_url: string;
  live_webhook_url: string;
  payment_channels?: string[];
  onSuccess: (args: unknown) => void;
  onClose: (args: unknown) => void;
}

type CheckoutUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  /** Legacy Clerk-shaped session (kept for defensive reads) */
  fullName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null };
};

/** Public origin for Switch-only URLs (callback, webhook, logo). Use ngrok HTTPS here in dev. */
function paymentsPublicOrigin(): string {
  const raw =
    (
      process.env.NEXT_PUBLIC_PAYMENTS_PUBLIC_ORIGIN ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      ""
    ).trim();
  return raw.replace(/\/$/, "");
}

interface InitiateCheckoutParams {
  form: {
    getValues: (key: string) => number;
  };
  /** Must be signed-in with `id` (e.g. Auth.js session user). */
  user: CheckoutUser;
  project?: (ProjectSchema & { id: string }) | null;
  txRef: string;
  pledgeId: string;
  paymentType: "donation" | "pledge";
  router: {
    push: (path: string) => void;
  };
}

const useSwitchAppCheckout = () => {
  // State to hold the SwitchAppCheckout client
  const [switchappClient, setSwitchappClient] = useState<any | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  // Initialize SwitchAppCheckout client only on the client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("@switchappgo/switchapp-inline")
        .then((module) => {
          const SwitchAppCheckout = module.default;
          const client = new SwitchAppCheckout({
            publicApiKey: process.env.NEXT_PUBLIC_SW_PUBLIC_KEY || "",
          });
          setSwitchappClient(client);
          setIsClientReady(true);
          console.log("SwitchAppCheckout client initialized");
        })
        .catch((error) => {
          console.error("Failed to load SwitchAppCheckout:", error);
          toast.error("Failed to initialize payment client");
        });
    }
  }, []);

  // Function to initiate checkout
  const initiateCheckout = useCallback(
    async ({
      form,
      user,
      project,
      txRef,
      pledgeId,
      paymentType,
      router,
    }: InitiateCheckoutParams): Promise<unknown> => {
      if (!isClientReady || !switchappClient) {
        console.error("SwitchAppCheckout client not ready");
        toast.error("Payment client not initialized", {
          description: "Please try again in a moment.",
        });
        return;
      }

      try {
        if (!user?.id) {
          toast.error("Sign in required", {
            description: "Please sign in to complete payment.",
          });
          return;
        }

        const amount = form.getValues("amount");
        if (!amount || amount <= 0) {
          throw new Error("Invalid amount provided");
        }

        const email =
          (typeof user?.email === "string" && user.email.trim()) ||
          user?.primaryEmailAddress?.emailAddress?.trim() ||
          "";
        if (!email) {
          toast.error("Email required for payment", {
            description: "Sign in with an account that has an email address.",
          });
          return;
        }

        const fullName =
          (typeof user?.name === "string" && user.name.trim()) ||
          (typeof user?.fullName === "string" && user.fullName.trim()) ||
          "Anonymous";

        const origin = paymentsPublicOrigin();
        if (!origin) {
          toast.error("Missing public URL for payments", {
            description:
              "Set NEXT_PUBLIC_PAYMENTS_PUBLIC_ORIGIN (e.g. ngrok HTTPS) or NEXT_PUBLIC_BASE_URL.",
          });
          return;
        }

        const paymentDetails: PaymentDetails = {
          country: "NG",
          currency: "NGN",
          amount: amount,
          customer: {
            full_name: fullName,
            email,
          },
          title:
            paymentType === "donation"
              ? "General Donation"
              : `Pledge for ${project?.title || "Project"}`,
          description:
            paymentType === "donation"
              ? "General donation"
              : `Support for: ${project?.title || "Project"}`,
          tx_ref: txRef,
          public_key: process.env.NEXT_PUBLIC_SW_PUBLIC_KEY || "",
          metadata: {
            userId: user.id,
            pledgeId,
            paymentType,
            projectId: project?.id,
          },
          callback_url: `${origin}/payments/success?paymentType=${paymentType}`,
          live_webhook_url: `${origin}/api/webhooks/switchapp`,
          logo_url: `${origin}/favicon.png`,
          onSuccess: (args: unknown) => {
            console.log("Payment successful with args:", args);
            void (async () => {
              try {
                const res = await fetch("/api/payments/switchapp/verify", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ txRef }),
                });
                if (!res.ok) {
                  const err = (await res.json().catch(() => ({}))) as {
                    error?: string;
                  };
                  console.error("Switch verify failed:", res.status, err);
                  toast.warning("Payment received; confirmation is still syncing.", {
                    description:
                      err.error ||
                      "Your record will update when the server confirms with Switch. Try refreshing shortly.",
                  });
                } else {
                  toast.success("Payment completed successfully");
                }
              } catch (e) {
                console.error("Switch verify request error:", e);
                toast.warning("Payment received; could not reach confirmation endpoint.", {
                  description:
                    "Check your connection and refresh your dashboard in a moment.",
                });
              }
              router.push(
                paymentType === "donation" || !project?.slug
                  ? "/dashboard"
                  : `/projects/${project.slug}`
              );
            })();
          },
          onClose: (args: unknown) => {
            console.log("Modal closed with args:", args);
            toast.info("Payment Modal Closed");
          },
        };

        const result = await switchappClient.showCheckoutModal(paymentDetails);
        toast.success("Payment Initialized");
        return result;
      } catch (error: any) {
        console.error("Checkout initialization failed:", error);
        toast.error("Checkout Initialization Failed", {
          description: error.message || "An unexpected error occurred",
        });
        throw error;
      }
    },
    [switchappClient, isClientReady]
  );

  return { initiateCheckout, isClientReady };
};

export default useSwitchAppCheckout;
