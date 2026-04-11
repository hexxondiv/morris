import { getTotalUserCount } from "@/lib/actions/users";
import { userColumns } from "@/lib/columns/user-columns";
import { DataTable } from "../../../../components/components/datatable";
import { clerkClient } from "@clerk/nextjs/server";


export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  firstName: string;
  lastName: string;
}

async function fetchInitialUsers(pageIndex: number = 0, pageSize: number = 10, globalFilter: string = "") {
  const offset = pageIndex * pageSize;
  const clerk = await clerkClient();
  const response = await clerk.users.getUserList({
    limit: pageSize,
    offset,
    query: globalFilter || undefined,
  });

  // Note: Adjust total count based on Clerk's capabilities
  const total = response.totalCount || (await getTotalUserCount(globalFilter));

  const data: User[] = response.data ? response.data.map((user: any) => ({
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress || "No email",
    role: user.publicMetadata.role || "user",
    createdAt: user.createdAt.toString(),
    firstName: user.firstName || "",
    lastName: user.lastName || "",
  })) : [];

  return { data, total };
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  // Await the searchParams Promise
  const resolvedSearchParams = await searchParams;
  
  const pageIndex = parseInt(resolvedSearchParams?.page || "0", 10);
  const search = resolvedSearchParams?.search || "";
  const { data: initialData, total: initialTotal } = await fetchInitialUsers(pageIndex, 10, search);

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