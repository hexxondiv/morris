"use client";

import { EnhancedDataTable } from "@/components/enhanced-data-table";
import { ColumnDef } from "@tanstack/react-table";

interface DataTableWrapperProps<TData> {
  columns: ColumnDef<TData>[];
  initialData: TData[];
  initialTotal: number;
  fetchUrl: string;
  header?: string;
  exportFilename?: string;
  filters?: {
    key: string;
    label: string;
    options: { value: string; label: string }[];
  }[];
  searchPlaceholder?: string;
  showExport?: boolean;
  showFilters?: boolean;
  showDateFilter?: boolean;
  dateFilterLabel?: string
  dateFilterKey?: string;
}

export function DataTableWrapper<TData>({
  columns,
  initialData,
  initialTotal,
  fetchUrl,
  header,
  exportFilename,
  filters = [],
  searchPlaceholder = "Search...",
  showExport = true,
  showFilters = true,
  showDateFilter = false,
  dateFilterLabel = "Created at",
  dateFilterKey = "created_at"
}: DataTableWrapperProps<TData>) {
  return (
    <EnhancedDataTable
      columns={columns}
      initialData={initialData}
      initialTotal={initialTotal}
      fetchUrl={fetchUrl}
      header={header}
      exportFilename={exportFilename}
      filters={filters}
      searchPlaceholder={searchPlaceholder}
      showExport={showExport}
      showFilters={showFilters}
      showDateFilter={showDateFilter}
      dateFilterLabel={dateFilterLabel}
      dateFilterKey={dateFilterKey}
    />
  );
}
