import { redirect } from "next/navigation";
import { fetchPledges } from "@/lib/actions/pledge";
import { DataTableWrapper } from "@/components/data-table-wrapper";
import { pledgeColumns } from "@/lib/columns/pledge-columns";
import { requireRole } from "@/lib/clerk";

export default async function PledgesPage() {

  const auth = await requireRole("admin");
  if (!auth.authorized) redirect("/unauthorized");

  const { data: initialData, total: initialTotal } = await fetchPledges(1,10,"");

  const filters = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "pending", label: "Pending" },
        { value: "completed", label: "Completed" },
        { value: "failed", label: "Failed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "pledge_type",
      label: "Type",
      options: [
        { value: "one_time", label: "One-time" },
        { value: "recurring", label: "Recurring" },
      ],
    },
    {
      key: "recurrence_interval",
      label: "Interval",
      options: [
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "yearly", label: "Yearly" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <DataTableWrapper
        columns={pledgeColumns}
        initialData={initialData}
        initialTotal={initialTotal}
        fetchUrl="/api/pledges"
        header="Pledge Management"
        exportFilename="pledges"
        filters={filters}
        searchPlaceholder="Search pledges..."
        showDateFilter={true}
        dateFilterLabel="Created Date"
        dateFilterKey="created_at"
      />
    </div>
  );
}
