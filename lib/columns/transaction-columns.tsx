"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Transaction } from "@/types/transaction";
import { StatusBadge } from "@/components/ui/status-badge";
import { TransactionActions } from "@/app/(dashboard)/admin/transactions/transaction-actions";
import { formatDateSmart } from "../utils/date-time-formater";

// Status and type color maps
const paymentStatusColorMap = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  refunded: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const paymentTypeColorMap = {
  pledge:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  donation: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  deployment: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  expense:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  refund: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const paymentTypeLabelMap = {
  pledge: "Pledge",
  donation: "Donation",
  deployment: "Deployment",
  expense: "Expense",
  refund: "Refund",
};

export const transactionColumns: ColumnDef<Transaction>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
    size: 40,
  },
  {
    accessorKey: "payment_ref",
    header: "Reference",
    cell: ({ row }) => (
      <div
        className="font-mono text-xs max-w-[120px] truncate"
        title={row.original.payment_ref || row.original.id}
      >
        {row.original.payment_ref || row.original.id.slice(0, 8)}
      </div>
    ),
  },
  {
    accessorKey: "user_email",
    header: "User",
    cell: ({ row }) => (
      <div className="min-w-[150px]">
        {row.original.user_name && row.original.user_name !== "Unknown" && (
          <div className="font-medium text-sm">{row.original.user_name}</div>
        )}
        <div
          className="text-xs text-gray-500 dark:text-gray-400 truncate"
          title={row.original.user_email}
        >
          {row.original.user_email || row.original.user_id}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "payment_type",
    header: "Type",
    cell: ({ row }) => (
      <StatusBadge
        value={row.original.payment_type}
        statusMap={paymentTypeColorMap}
        formatter={(val) =>
          paymentTypeLabelMap[val as keyof typeof paymentTypeLabelMap] || val
        }
      />
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="font-medium text-right">
        <div className="text-sm">
          {row.original.currency} {row.original.amount.toLocaleString()}
        </div>
        {row.original.category && (
          <div className="text-xs text-gray-500">{row.original.category}</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "payment_method",
    header: "Method",
    cell: ({ row }) => (
      <div className="text-sm">{row.original.payment_method || "N/A"}</div>
    ),
  },
  {
    accessorKey: "payment_status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        value={row.original.payment_status}
        statusMap={paymentStatusColorMap}
      />
    ),
  },
  // {
  //   accessorKey: "paid_at",
  //   header: "Paid At",
  //   cell: ({ row }) => (
  //     <div className="text-sm text-gray-600 dark:text-gray-400">
  //       {formatDateSmart(row.original.paid_at)}
  //     </div>
  //   ),
  // },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {formatDateSmart(row.original.created_at)}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row, ...cellProps }) => (
      <TransactionActions
        transaction={row.original}
        setData={(cellProps as any)?.setData}
      />
    ),
  },
];
