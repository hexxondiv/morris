import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { User } from "@/app/(dashboard)/admin/users/page";
import { getTotalUserCount } from "@/lib/actions/users";
import { clerkClient } from "@clerk/nextjs/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageIndex = parseInt(searchParams.get("pageIndex") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const globalFilter = searchParams.get("globalFilter") || "";
  const offset = pageIndex * pageSize;
  const clerk = await clerkClient();

  const auth = await requireRole('admin');
  if (!auth.authorized) return auth.response;

  const response = await clerk.users.getUserList({
    limit: pageSize,
    offset,
    query: globalFilter || undefined,
  });

const data: User[] = response.data.map((user) => ({
  id: user.id,
  email: user.emailAddresses?.[0]?.emailAddress || "No email",
  role: (user.publicMetadata?.role as string) || "user",
  createdAt: user.createdAt?.toString() || new Date().toISOString(),
  firstName: user.firstName || "",
  lastName: user.lastName || "",
}));

  const total = await getTotalUserCount(globalFilter);

  return NextResponse.json({ data, total });
}

