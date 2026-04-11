"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface InitiateCheckoutParams {
  form: {
    getValues: (key: string) => number;
  };
  user: any;
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
        const amount = form.getValues("amount");
        if (!amount || amount <= 0) {
          throw new Error("Invalid amount provided");
        }

        const paymentDetails: PaymentDetails = {
          country: "NG",
          currency: "NGN",
          amount: amount,
          customer: {
            full_name: user.fullName || "Anonymous",
            email: user.primaryEmailAddress?.emailAddress || "",
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
          callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments/success?paymentType=${paymentType}`,
          live_webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/switchapp`,
          logo_url: `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`,
          onSuccess: (args: unknown) => {
            console.log('Payment successful with args:', args);
            toast.success('Payment completed successfully');
            router.push(
              paymentType === 'donation' || !project?.slug
                ? '/dashboard'
                : `/projects/${project.slug}`
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
    [switchappClient, isClientReady]
  );

  return { initiateCheckout, isClientReady };
};

export default useSwitchAppCheckout;
