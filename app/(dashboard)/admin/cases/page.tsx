"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EnhancedDataTable } from "@/components/enhanced-data-table";
import { caseColumns } from "@/lib/columns/case-columns";
import { getCaseStatistics } from "@/lib/actions/cases";
import { Badge } from "@/components/ui/badge";

export default function CasesPage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [initialData] = useState([]);
  const [initialTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      const stats = await getCaseStatistics();
      setPendingCount(stats.pending);
    };
    fetchStats();
  }, [refreshKey]);

  // Set up global refresh function
  useEffect(() => {
    const refreshTable = () => setRefreshKey(prev => prev + 1);

    // Make refresh function globally accessible
    (window as any).refreshCasesTable = refreshTable;

    // Cleanup on unmount
    return () => {
      delete (window as any).refreshCasesTable;
    };
  }, []);

  const filters = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "pending", label: "Pending" },
        { value: "reviewing", label: "Reviewing" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "completed", label: "Completed" },
      ],
    },
    {
      key: "help_type",
      label: "Help Type",
      options: [
        { value: "school_fees", label: "School Fees" },
        { value: "educational_materials", label: "Educational Materials" },
        { value: "infrastructure", label: "Infrastructure" },
        { value: "scholarship", label: "Scholarship" },
        { value: "health_welfare", label: "Health & Welfare" },
        { value: "other", label: "Other" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            {pendingCount} Pending Request{pendingCount !== 1 ? 's' : ''}
          </Badge>
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            {pendingCount === 1 ? 'This case requires' : 'These cases require'} your review. Accept to move to reviewing or reject to delete.
          </span>
        </div>
      )}

      <EnhancedDataTable
        key={refreshKey}
        columns={caseColumns}
        initialData={initialData}
        initialTotal={initialTotal}
        fetchUrl="/api/cases"
        header="Case Management"
        exportFilename="case-reports"
        filters={filters}
        searchPlaceholder="Search cases by ref, name, phone, description..."
        showDateFilter={true}
        dateFilterLabel="Submission Date"
        dateFilterKey="created_at"
      />
    </div>
  );
}
