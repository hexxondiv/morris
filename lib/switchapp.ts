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
  anonymous?: boolean;
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

type RuntimePaymentsConfig = {
  publicKey: string;
  publicOrigin: string;
};

type CheckoutUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  /** Legacy Clerk-shaped session (kept for defensive reads) */
  fullName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null };
};

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
  anonymous?: boolean;
  router: {
    push: (path: string) => void;
  };
}

const useSwitchAppCheckout = () => {
  // State to hold the SwitchAppCheckout client
  const [switchappClient, setSwitchappClient] = useState<any | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimePaymentsConfig | null>(
    null
  );

  // Initialize SwitchAppCheckout client only on the client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      fetch("/api/payments/switchapp/config", { cache: "no-store" })
        .then(async (res) => {
          const config = (await res.json()) as Partial<RuntimePaymentsConfig>;
          if (!res.ok) {
            throw new Error("Failed to load payment config");
          }
          const publicKey = (config.publicKey || "").trim();
          const publicOrigin = (config.publicOrigin || "").trim();
          if (!publicKey || !publicOrigin) {
            throw new Error("Missing Switch runtime configuration");
          }

          const module = await import("@switchappgo/switchapp-inline");
          const SwitchAppCheckout = module.default;
          const client = new SwitchAppCheckout({ publicApiKey: publicKey });
          setRuntimeConfig({ publicKey, publicOrigin });
          setSwitchappClient(client);
          setIsClientReady(true);
          console.log("SwitchAppCheckout client initialized");
        })
        .catch((error) => {
          console.error("Failed to load SwitchAppCheckout:", error);
          toast.error("Failed to initialize payment client", {
            description:
              "Check runtime payment env vars: NEXT_PUBLIC_SW_PUBLIC_KEY and NEXT_PUBLIC_PAYMENTS_PUBLIC_ORIGIN/NEXT_PUBLIC_BASE_URL.",
          });
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
      anonymous,
      router,
    }: InitiateCheckoutParams): Promise<unknown> => {
      if (!isClientReady || !switchappClient || !runtimeConfig) {
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

        const origin = runtimeConfig.publicOrigin;
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
          public_key: runtimeConfig.publicKey,
          metadata: {
            userId: user.id,
            pledgeId,
            paymentType,
            projectId: project?.id,
            anonymous: Boolean(anonymous),
          },
          callback_url: `${origin}/payments/success?paymentType=${paymentType}&txRef=${encodeURIComponent(
            txRef
          )}`,
          live_webhook_url: `${origin}/api/webhooks/switchapp`,
          logo_url: `${origin}/favicon.png`,
          onSuccess: (args: unknown) => {
            console.log("Payment successful with args:", args);
            toast.success("Payment received. Verifying transaction...");
            router.push(
              `/payments/success?paymentType=${paymentType}&txRef=${encodeURIComponent(txRef)}`
            );
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
    [switchappClient, isClientReady, runtimeConfig]
  );

  return { initiateCheckout, isClientReady };
};

export default useSwitchAppCheckout;
