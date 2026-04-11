import { useState, useEffect } from "react";
import { PublicLedgerEntry } from "@/types/public-ledger";
import { Transaction } from "@/types/transaction";
import { fetchTransactionById } from "@/lib/actions/transaction";

export const useTransactionDetails = (transactionId: string) => {
  const [data, setData] = useState<{
    transaction: PublicLedgerEntry | null;
    loading: boolean;
    error: string | null;
  }>({
    transaction: null,
    loading: true,
    error: null,
  });

  const fetchTransaction = async (): Promise<void> => {
    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      const result: Transaction | null = await fetchTransactionById(transactionId);

      if (!result) throw new Error("Transaction not found");

      // Use user_name from the Transaction type
      const fullName = result.user_name || "Anonymous";
      const transaction: PublicLedgerEntry = {
        id: result.id,
        date: result.paid_at,
        type: ["pledge", "donation"].includes(result.payment_type)
          ? "inflow"
          : "outflow",
        description:
          result.payment_type === "pledge" || result.payment_type === "donation"
            ? fullName
            : result.payment_type === "deployment" && result.project_title
            ? `Project Deployment: ${result.project_title}`
            : result.payment_type === "deployment"
            ? "Project Deployment"
            : result.chart_public_name || "Transaction",
        amount: ["deployment", "expense", "refund"].includes(result.payment_type)
          ? -result.amount
          : result.amount,
        category:
          result.payment_type === "pledge" || result.payment_type === "donation"
            ? "Donations"
            : result.chart_public_name ||
              (result.payment_type === "deployment"
                ? "Project Deployments"
                : "Operations"),
        subcategory:
          result.project_title || result.chart_name || "General",
        reference: result.payment_ref || "",
        items:
          result.description ||
          (result.payment_type === "deployment" && result.project_title
            ? `Funds deployed to ${result.project_title} project`
            : result.payment_type === "pledge" ||
              result.payment_type === "donation"
            ? `Donation received via ${
                result.payment_method?.toUpperCase() || "UNKNOWN"
              }`
            : result.chart_name ||
              `Transaction via ${
                result.payment_method?.toUpperCase() || "SYSTEM"
              }`),
        status: result.payment_status,
        payment_method: result.payment_method != "UNKNOWN" ? result.payment_method?.toUpperCase() || "BANK TRANSFER" : "BANK TRANSFER",

        running_balance: result.running_balance || 0,
      };
      console.log("Fetched transaction:", transaction);

      setData({
        transaction,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching transaction details:", error);
      setData({
        transaction: null,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load transaction details",
      });
    }
  };

  useEffect(() => {
    if (transactionId) fetchTransaction();
  }, [transactionId]);

  return {
    ...data,
    refetch: fetchTransaction,
  };
};
