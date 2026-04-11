import { userColumns } from "@/lib/columns/user-columns";
import { DataTable } from "../../../../components/components/datatable";
import {
  countUsersForAdmin,
  listUsersForAdmin,
} from "@/lib/repositories/user-repository";

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  firstName: string;
  lastName: string;
}

async function fetchInitialUsers(
  pageIndex: number = 0,
  pageSize: number = 10,
  globalFilter: string = ""
) {
  const offset = pageIndex * pageSize;
  const data: User[] = await listUsersForAdmin(offset, pageSize, globalFilter);
  const total = await countUsersForAdmin(globalFilter);

  return { data, total };
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  const pageIndex = parseInt(resolvedSearchParams?.page || "0", 10);
  const search = resolvedSearchParams?.search || "";
  const { data: initialData, total: initialTotal } = await fetchInitialUsers(
    pageIndex,
    10,
    search
  );

  return (
    <div className="w-full">
      <DataTable
        columns={userColumns}
        initialData={initialData}
        initialTotal={initialTotal}
        fetchUrl="/api/users"
        header="User Management"
      />
    </div>
  );
}
