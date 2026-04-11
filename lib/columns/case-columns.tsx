"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Case } from "@/types/case.types";
import { StatusBadge } from "@/components/ui/status-badge";
import { CaseActions } from "@/app/(dashboard)/admin/cases/case-actions";
import { formatDateSmart } from "../utils/date-time-formater";

// Status color map
const caseStatusColorMap = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  reviewing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  completed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

// Help type labels
const helpTypeLabels = {
  school_fees: "School Fees",
  educational_materials: "Educational Materials",
  infrastructure: "Infrastructure",
  scholarship: "Scholarship",
  health_welfare: "Health & Welfare",
  other: "Other",
};

export const caseColumns: ColumnDef<Case>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
    size: 40,
  },
  {
    accessorKey: "case_reference_id",
    header: "Case Ref",
    cell: ({ row }) => (
      <div className="font-mono text-xs font-semibold text-theme-700">
        {row.original.case_reference_id}
      </div>
    ),
  },
  {
    accessorKey: "full_name",
    header: "Reporter",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.full_name}</div>
        <div className="text-xs text-muted-foreground">{row.original.phone}</div>
      </div>
    ),
  },
  {
    accessorKey: "reporting_for",
    header: "Reporting For",
    cell: ({ row }) => (
      <div>
        {row.original.reporting_for === "myself" ? (
          <span className="text-xs">Self</span>
        ) : (
          <div>
            <div className="text-xs font-medium">{row.original.beneficiary_name}</div>
            <div className="text-xs text-muted-foreground">
              ({row.original.relationship})
            </div>
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "help_type",
    header: "Help Type",
    cell: ({ row }) => (
      <span className="text-sm">
        {helpTypeLabels[row.original.help_type]}
      </span>
    ),
  },
  {
    accessorKey: "state_name",
    header: "Location",
    cell: ({ row }) => (
      <div className="text-sm">
        <div>{row.original.state_name}</div>
        <div className="text-xs text-muted-foreground">{row.original.lga_name}</div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        value={row.original.status}
        statusMap={caseStatusColorMap}
      />
    ),
  },
  {
    accessorKey: "created_at",
    header: "Submitted",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDateSmart(row.original.created_at)}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <CaseActions caseItem={row.original} />,
  },
];
