// components/enhanced-data-table.tsx (With Date Range Filter)
"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn, pluralize } from "@/lib/utils";

interface EnhancedDataTableProps<TData> {
  columns: ColumnDef<TData>[];
  initialData: TData[];
  initialTotal: number;
  fetchUrl: string;
  header?: string;
  pageSize?: number;
  searchPlaceholder?: string;
  exportFilename?: string;
  filters?: {
    key: string;
    label: string;
    options: { value: string; label: string }[];
  }[];
  showExport?: boolean;
  showFilters?: boolean;
  showDateFilter?: boolean;
  dateFilterLabel?: string;
  dateFilterKey?: string; // Which date field to filter on (default: "created_at")
}

// Skeleton loader component
const TableSkeleton = ({ columns }: { columns: ColumnDef<any>[] }) => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow
        key={i}
        className="border-b border-gray-100 dark:border-gray-800"
      >
        {columns.map((_, j) => (
          <TableCell key={j} className="px-6 py-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

// Date Range Picker Component
function DateRangePicker({
  dateRange,
  setDateRange,
  label = "Date Range",
}: {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  label?: string;
}) {
  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "MMM dd, y")} -{" "}
                  {format(dateRange.to, "MMM dd, y")}
                </>
              ) : (
                format(dateRange.from, "MMM dd, y")
              )
            ) : (
              <span>{label}</span>
            )}
            {dateRange?.from && (
              <X
                className="ml-auto h-4 w-4 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  setDateRange(undefined);
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Constants for select values
const ALL_ITEMS_VALUE = "__all__";
const EMPTY_FILTER_VALUE = "";

export function EnhancedDataTable<TData>({
  columns,
  initialData,
  initialTotal,
  fetchUrl,
  header,
  pageSize: initialPageSize = 10,
  searchPlaceholder = "Search...",
  exportFilename = "data",
  filters = [],
  showExport = true,
  showFilters = true,
  showDateFilter = true,
  dateFilterLabel = "Date Range",
  dateFilterKey = "created_at",
}: EnhancedDataTableProps<TData>) {
  const [data, setData] = useState<TData[]>(initialData);
  const [totalRows, setTotalRows] = useState(initialTotal);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [globalFilter, setGlobalFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    {}
  );
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Check if enhanced features should be shown
  const hasFilters = filters.length > 0 || showDateFilter;
  const shouldShowFiltersButton = showFilters && hasFilters;
  const shouldShowExportButton = showExport;

  // Helper function to get display value for selects (never empty string)
  const getSelectDisplayValue = (filterKey: string): string => {
    const value = activeFilters[filterKey];
    return value && value !== EMPTY_FILTER_VALUE ? value : ALL_ITEMS_VALUE;
  };

  // Helper function to handle select changes
  const handleSelectChange = (filterKey: string, displayValue: string) => {
    const actualValue =
      displayValue === ALL_ITEMS_VALUE ? EMPTY_FILTER_VALUE : displayValue;
    setActiveFilters((prev) => ({ ...prev, [filterKey]: actualValue }));
  };

  // Build query string with all filters
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams({
      pageIndex: pageIndex.toString(),
      pageSize: pageSize.toString(),
      globalFilter: globalFilter,
    });

    // Add active filters (skip empty values)
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== EMPTY_FILTER_VALUE) {
        params.set(key, value);
      }
    });

    // Add date range filters
    if (dateRange?.from) {
      params.set("dateFrom", dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      // Add end of day to include the entire "to" date
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      params.set("dateTo", endOfDay.toISOString());
    }

    // Add date filter key if different from default
    if (dateFilterKey !== "created_at") {
      params.set("dateField", dateFilterKey);
    }

    return params.toString();
  }, [
    pageIndex,
    pageSize,
    globalFilter,
    activeFilters,
    dateRange,
    dateFilterKey,
  ]);

  // Fetch data function
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${fetchUrl}?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setData(result.data);
      setTotalRows(result.total);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, buildQueryString]);

  // Export data function
  const exportData = async () => {
    try {
      const exportUrl = `${fetchUrl}/export`;
      const response = await fetch(`${exportUrl}?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to export data");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportFilename}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  // Effects for fetching data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (pageIndex !== 0) {
        setPageIndex(0);
      } else {
        fetchData();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [globalFilter, activeFilters, dateRange]);

  useEffect(() => {
    fetchData();
  }, [pageIndex, pageSize, fetchData]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalRows / pageSize),
    state: {
      pagination: { pageIndex, pageSize },
      globalFilter,
    },
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      setPageIndex(newPagination.pageIndex);
      setPageSize(newPagination.pageSize);
    },
    onGlobalFilterChange: setGlobalFilter,
    meta: { setData },
  });

  const paginationInfo = useMemo(() => {
    const start = pageIndex * pageSize + 1;
    const end = Math.min((pageIndex + 1) * pageSize, totalRows);
    return { start, end, total: totalRows };
  }, [pageIndex, pageSize, totalRows]);

  const clearAllFilters = () => {
    setGlobalFilter("");
    setActiveFilters({});
    setDateRange(undefined);
  };

  const hasActiveFilters =
    globalFilter ||
    Object.values(activeFilters).some(
      (value) => value && value !== EMPTY_FILTER_VALUE
    ) ||
    dateRange?.from;

  const activeFilterCount = [
    globalFilter ? 1 : 0,
    Object.values(activeFilters).filter((v) => v && v !== EMPTY_FILTER_VALUE)
      .length,
    dateRange?.from ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="w-full space-y-6">
      {/* Header and controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {header && (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {header}
            </h2>
          </div>
        )}

        {/* Simple search - always visible when no filters */}
        {!hasFilters && (
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 h-10 border-gray-200 bg-white shadow-sm focus:border-theme-500 focus:ring-1 focus:ring-theme-500 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-theme-400"
            />
          </div>
        )}

        {/* Enhanced controls */}
        {(shouldShowFiltersButton || shouldShowExportButton) && (
          <div className="flex items-center gap-3">
            {shouldShowFiltersButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={`${
                  showFiltersPanel
                    ? "bg-theme-50 border-theme-500 dark:bg-theme-950"
                    : ""
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-theme-500 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            )}

            {shouldShowExportButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Enhanced filters panel */}
      {showFiltersPanel && hasFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Filters
            </h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-red-600 hover:text-red-700 bg-red-50 dark:text-red-400 dark:hover:text-red-300"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search in filters panel */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date Range Filter */}
            {showDateFilter && (
              <div className="lg:col-span-2">
                <DateRangePicker
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  label={dateFilterLabel}
                />
              </div>
            )}

            {/* Dynamic filters */}
            {filters.map((filter) => (
              <Select
                key={filter.key}
                value={getSelectDisplayValue(filter.key)}
                onValueChange={(value) => handleSelectChange(filter.key, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${(filter.label)}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ITEMS_VALUE}>
                    All {pluralize(filter.label)}
                  </SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Active filters:
              </span>
              {globalFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Search: "{globalFilter}"
                </span>
              )}
              {Object.entries(activeFilters).map(([key, value]) =>
                value && value !== EMPTY_FILTER_VALUE ? (
                  <span
                    key={key}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    {filters.find((f) => f.key === key)?.label}:{" "}
                    {filters
                      .find((f) => f.key === key)
                      ?.options.find((o) => o.value === value)?.label || value}
                  </span>
                ) : null
              )}
              {dateRange?.from && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  Date: {format(dateRange.from, "MMM dd")}{" "}
                  {dateRange.to && `- ${format(dateRange.to, "MMM dd")}`}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-gray-200 bg-gray-50/50 hover:bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton columns={columns} />
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="text-lg">No results found</div>
                      {hasActiveFilters && (
                        <div className="text-sm">
                          Try adjusting your filters or search terms
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing <span className="font-medium">{paginationInfo.start}</span> to{" "}
          <span className="font-medium">{paginationInfo.end}</span> of{" "}
          <span className="font-medium">{paginationInfo.total}</span> results
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || loading}
            className="h-9 px-3 flex items-center space-x-1 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-1 text-sm font-medium text-gray-900 dark:text-gray-100">
            <span>Page</span>
            <span className="px-2 py-1 bg-theme-500 text-white rounded text-xs font-semibold">
              {table.getState().pagination.pageIndex + 1}
            </span>
            <span>of {table.getPageCount()}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || loading}
            className="h-9 px-3 flex items-center space-x-1 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
