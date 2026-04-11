import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getPrimaryRole } from "@/lib/auth/roles";

export async function countUsersForAdmin(globalFilter: string) {
  const where = userSearchWhere(globalFilter);
  return prisma.user.count({ where });
}

export async function listUsersForAdmin(
  offset: number,
  pageSize: number,
  globalFilter: string
) {
  const where = userSearchWhere(globalFilter);
  const users = await prisma.user.findMany({
    where,
    skip: offset,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    include: {
      userRoles: {
        include: { role: { select: { key: true } } },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    role: getPrimaryRole(u.userRoles),
    createdAt: u.createdAt.toISOString(),
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
  }));
}

function userSearchWhere(globalFilter: string): Prisma.UserWhereInput {
  if (!globalFilter.trim()) return {};
  const q = globalFilter.trim();
  return {
    OR: [
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { displayName: { contains: q } },
    ],
  };
}
