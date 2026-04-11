import { redirect } from "next/navigation";
import { fetchTransactions } from "@/lib/actions/transaction";
import { EnhancedDataTable } from "@/components/enhanced-data-table";
import { transactionColumns } from "@/lib/columns/transaction-columns";
import { requireRole } from "@/lib/auth/server";

export default async function TransactionsPage() {
  const auth = await requireRole("moderator");
  if (!auth.authorized) redirect("/unauthorized");

  const { data: initialData, total: initialTotal } = await fetchTransactions(1,10,"");

  const filters = [
    {
      key: "payment_status",
      label: "Status",
      options: [
        { value: "pending", label: "Pending" },
        { value: "completed", label: "Completed" },
        { value: "failed", label: "Failed" },
        { value: "refunded", label: "Refunded" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "payment_type",
      label: "Type",
      options: [
        { value: "pledge", label: "Pledge" },
        { value: "donation", label: "Donation" },
        { value: "deployment", label: "Deployment" },
        { value: "expense", label: "Expense" },
        { value: "refund", label: "Refund" },
      ],
    },
    {
      key: "payment_method",
      label: "Method",
      options: [
        { value: "card", label: "Card" },
        { value: "bank_transfer", label: "Bank Transfer" },
        { value: "ussd", label: "USSD" },
        { value: "qr", label: "QR Code" },
        { value: "mobile_money", label: "Mobile Money" },
      ],
    },
    {
      key: "category",
      label: "Category",
      options: [
        { value: "subscription", label: "Subscription" },
        { value: "one_time", label: "One Time" },
        { value: "refund", label: "Refund" },
        { value: "fee", label: "Fee" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <EnhancedDataTable
        columns={transactionColumns}
        initialData={initialData}
        initialTotal={initialTotal}
        fetchUrl="/api/transactions"
        header="Transaction Management"
        exportFilename="transactions"
        filters={filters}
        searchPlaceholder="Search transactions..."
        showDateFilter={true}
        dateFilterLabel="Transaction Date"
        dateFilterKey="created_at"
      />
    </div>
  );
}
