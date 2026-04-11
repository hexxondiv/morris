import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/server";
import { getPrimaryRole, normalizeRole } from "@/lib/auth/roles";
import type { Role } from "@/types/database.types";

const ASSIGNABLE_ROLES: Role[] = ["admin", "moderator", "editor", "user"];

export async function POST(req: Request) {
  const auth = await requireRole("admin");
  if (!auth.authorized) return auth.response;

  const { userId, role } = await req.json();
  const normalized = normalizeRole(typeof role === "string" ? role : "");

  if (!ASSIGNABLE_ROLES.includes(normalized)) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: { select: { key: true } } },
      },
    },
  });

  if (!targetUser) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const targetPrimary = getPrimaryRole(targetUser.userRoles);
  if (targetPrimary === "super_admin" && auth.userRole !== "super_admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const roleRecord = await prisma.role.findUnique({ where: { key: normalized } });
  if (!roleRecord) {
    return NextResponse.json(
      { success: false, error: "Role is not provisioned in the database (run seed / migrations)." },
      { status: 500 }
    );
  }

  try {
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.create({
        data: {
          userId,
          roleId: roleRecord.id,
          assignedBy: auth.userId,
        },
      }),
    ]);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ success: false, error: "Failed to update role" }, { status: 500 });
  }

  // Workstream 05/06 boundary: legacy Supabase `profiles.role` and other denormalized copies
  // are not updated here; reads must use Prisma `UserRole` / session callback.

  return NextResponse.json({ success: true });
}
