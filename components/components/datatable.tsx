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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  initialData: TData[];
  initialTotal: number;
  fetchUrl: string;
  header?: string;
  pageSize?: number;
  searchPlaceholder?: string;
}

// Skeleton loader component
const TableSkeleton = ({ columns }: { columns: ColumnDef<any>[] }) => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i} className="border-b border-gray-100 dark:border-gray-800">
        {columns.map((_, j) => (
          <TableCell key={j} className="px-6 py-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

export function DataTable<TData>({
  columns,
  initialData,
  initialTotal,
  fetchUrl,
  header,
  pageSize: initialPageSize = 10,
  searchPlaceholder = "Search...",
}: DataTableProps<TData>) {
  const [data, setData] = useState<TData[]>(initialData);
  const [totalRows, setTotalRows] = useState(initialTotal);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [globalFilter, setGlobalFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${fetchUrl}?pageIndex=${pageIndex}&pageSize=${pageSize}&globalFilter=${encodeURIComponent(
          globalFilter
        )}`
      );
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setData(result.data);
      setTotalRows(result.total);
    } catch (error) {
      console.error("Error fetching data:", error);
      // Could add error state here
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, globalFilter, fetchUrl]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (pageIndex !== 0) {
        setPageIndex(0); // Reset to first page when searching
      } else {
        fetchData();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [globalFilter, fetchData, pageIndex]);

  // Effect for pagination changes
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
  });

  // Memoized pagination info
  const paginationInfo = useMemo(() => {
    const start = pageIndex * pageSize + 1;
    const end = Math.min((pageIndex + 1) * pageSize, totalRows);
    return { start, end, total: totalRows };
  }, [pageIndex, pageSize, totalRows]);

  return (
    <div className="w-full space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {header && (
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {header}
            </h2>
          </div>
        )}
        
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 h-10 border-gray-200 bg-white shadow-sm focus:border-theme-500 focus:ring-1 focus:ring-theme-500 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-theme-400"
          />
        </div>
      </div>

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
                        {flexRender(cell.column.columnDef.cell, {
                          ...cell.getContext(),
                          setData,
                        })}
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
                      {globalFilter && (
                        <div className="text-sm">
                          Try adjusting your search terms
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