import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import type { User } from "@/app/(dashboard)/admin/users/page";
import {
  countUsersForAdmin,
  listUsersForAdmin,
} from "@/lib/repositories/user-repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageIndex = parseInt(searchParams.get("pageIndex") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const globalFilter = searchParams.get("globalFilter") || "";
  const offset = pageIndex * pageSize;

  const auth = await requireRole("admin");
  if (!auth.authorized) return auth.response;

  const data: User[] = await listUsersForAdmin(offset, pageSize, globalFilter);
  const total = await countUsersForAdmin(globalFilter);

  return NextResponse.json({ data, total });
}
