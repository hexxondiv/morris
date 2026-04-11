"use client";

import { PledgeActions } from "@/app/(dashboard)/admin/pledges/pledge-action-dialogue";
import { ColumnDef } from "@tanstack/react-table";
import { capitalize, formatDate, toNaira } from "../utils";
import { StatusBadge } from "@/components/components/status-badge";

export interface Pledge {
  id: string;
  user_id: string;
  user_email: string;
  full_name?: string;
  project_id: string | null;
  project_title: string | null;
  amount: number;
  pledge_type: "one_time" | "recurring";
  recurrence_interval: "monthly" | "quarterly" | "yearly" | null;
  payment_day: "today" | "1st" | "28th" | null;
  status: "pending" | "completed" | "failed" | "cancelled";
  created_at: string;
}

const statusColorMap = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const pledgetypeMap = {
  one_time: "bg-blue-100 text-blue-800",
  recurring: "bg-purple-100 text-purple-800",
};

const pledgetypeLabelMap: Record<string, string> = {
  one_time: "One-Time",
  recurring: "Recurring",
};

export const pledgeColumns: ColumnDef<Pledge>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
    size: 40,
  },
  {
    accessorKey: "user_email",
    header: "User",
    cell: ({ row }) => (
      <div>
        <span className="text-center">{row.original.full_name}</span> <br />
        <span className="text-center">{row.original.user_email}</span>
      </div>
    ),
  },
  {
    accessorKey: "project_title",
    header: "Project",
    cell: ({ row }) => row.original.project_title || "General Pledge",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => `${toNaira(row.original.amount)}`,
  },
  {
    accessorKey: "pledge_type",
    header: "Pledge Type",
    cell: ({ row }) => (
      <StatusBadge
        value={row.original.pledge_type}
        statusMap={pledgetypeMap}
        formatter={(val) => pledgetypeLabelMap[val] || val}
      />
    ),
  },
  {
    accessorKey: "recurrence_interval",
    header: "Recurrence",
    cell: ({ row }) => row.original.recurrence_interval || "N/A",
  },
  {
    accessorKey: "payment_day",
    header: "Payment Day",
    cell: ({ row }) => row.original.payment_day || "N/A",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge value={row.original.status} statusMap={statusColorMap} />
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row, ...cellProps }) => (
      <PledgeActions pledge={row.original} setData={(cellProps as any)?.setData} />
    ),
  },
];
